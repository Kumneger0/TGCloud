
import Message from '@/lib/types';
import bigInt from 'big-integer';
import * as MP4Box from 'mp4box';
import { Api, TelegramClient } from 'telegram';

export function getVideoCodec(mimeType: string) {
	let mimeCodec: string;

	switch (mimeType) {
		case 'video/webm':
			mimeCodec = 'video/webm; codecs="vp9,opus"';
			break;
		case 'video/mp4':
			mimeCodec = 'video/mp4; codecs="avc1.64001f, mp4a.40.2"';
			break;
		case 'video/x-msvideo':
			mimeCodec = 'video/avi; codecs="avc1.64001f, mp4a.40.2"';
			break;
		case 'video/x-matroska':
			mimeCodec = 'video/x-matroska; codecs="avc1.64001f, mp4a.40.2"';
			break;
		default:
			mimeCodec = 'video/mp4; codecs="avc1.64001f, mp4a.40.2"';
	}
	return mimeCodec;
}

type StreamMediaArgs = {
	client: TelegramClient,
	media: Message['media'],
	mimeType: string,
	mediaSource: MediaSource
}

export const streamMedia = async (
	{ client, media, mimeType, mediaSource }: StreamMediaArgs,
) => {
	if (mimeType.startsWith('audio/') && !mimeType.includes('mp4') && !mimeType.includes('m4a')) {
		return streamDirectAudio(client, media, mimeType, mediaSource,);
	}

	if (mimeType === 'video/webm') {
		return streamWebM(client, media, mediaSource, mimeType);
	}

	return streamMP4(client, media, mediaSource, "video");
};

const streamWebM = async (
	client: TelegramClient,
	media: Message['media'],
	mediaSource: MediaSource,
	mimeType: string
) => {
	const codec = getVideoCodec(mimeType);

	return new Promise<void>((resolve, reject) => {
		const onSourceOpen = async () => {
			if (mediaSource.readyState !== 'open') return;
			mediaSource.removeEventListener('sourceopen', onSourceOpen);

			try {
				const sourceBuffer = mediaSource.addSourceBuffer(codec);
				const queue: BufferSource[] = [];
				let isAppending = false;

				const processQueue = () => {
					if (!isAppending && queue.length > 0 && !sourceBuffer.updating) {
						isAppending = true;
						try {
							sourceBuffer.appendBuffer(queue.shift()!);
						} catch (e) {
							console.error('Error appending buffer:', e);
						}
					}
				};

				sourceBuffer.addEventListener('updateend', () => {
					isAppending = false;
					processQueue();
				});

				for await (const chunk of client.iterDownload({
					file: media as unknown as Api.TypeMessageMedia,
					requestSize: 1024 * 1024,
				})) {
					if (mediaSource.readyState !== 'open') break;
					const buffer = new Uint8Array(chunk as unknown as ArrayBuffer);
					queue.push(buffer);
					processQueue();
				}

				const checkEnd = setInterval(() => {
					if (queue.length === 0 && !sourceBuffer.updating) {
						clearInterval(checkEnd);
						if (mediaSource.readyState === 'open') {
							mediaSource.endOfStream();
						}
						resolve();
					}
				}, 100);

			} catch (err) {
				console.error('Error in WebM streaming:', err);
				if (mediaSource.readyState === 'open') {
					mediaSource.endOfStream('decode');
				}
				reject(err);
			}
		};

		mediaSource.addEventListener('sourceopen', onSourceOpen);
	});
};

const streamDirectAudio = async (
	client: TelegramClient,
	media: Message['media'],
	mimeType: string,
	mediaSource: MediaSource
) => {
	if (MediaSource.isTypeSupported(mimeType)) {
		return new Promise<void>((resolve, reject) => {
			const onSourceOpen = async () => {
				if (mediaSource.readyState !== 'open') return;
				mediaSource.removeEventListener('sourceopen', onSourceOpen);

				try {
					const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
					const queue: Uint8Array[] = [];
					let isAppending = false;

					const processQueue = () => {
						if (!isAppending && queue.length > 0 && !sourceBuffer.updating) {
							isAppending = true;
							try {
								sourceBuffer.appendBuffer(queue.shift()! as BufferSource);
							} catch (e) {
								console.error('Error appending audio buffer:', e);
							}
						}
					};

					sourceBuffer.addEventListener('updateend', () => {
						isAppending = false;
						processQueue();
					});

					sourceBuffer.addEventListener('error', (e) => {
						console.error('SourceBuffer error:', e);
					});


					for await (const chunk of client.iterDownload({
						file: media as unknown as Api.TypeMessageMedia,
						requestSize: 512 * 1024,
					})) {
						if (mediaSource.readyState !== 'open') break;

						let buffer: Uint8Array;
						if (chunk instanceof ArrayBuffer) {
							buffer = new Uint8Array(chunk);
						} else if (ArrayBuffer.isView(chunk)) {
							buffer = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
						} else {
							buffer = new Uint8Array(chunk as unknown as ArrayLike<number>);
						}

						queue.push(buffer);
						processQueue();
					}

					const checkEnd = setInterval(() => {
						if (queue.length === 0 && !sourceBuffer.updating) {
							clearInterval(checkEnd);
							if (mediaSource.readyState === 'open') {
								mediaSource.endOfStream();
							}
							resolve();
						}
					}, 100);

				} catch (err) {
					console.error('error in audio streaming:', err);
					if (mediaSource.readyState === 'open') {
						mediaSource.endOfStream('decode');
					}
					reject(err);
				}
			};

			mediaSource.addEventListener('sourceopen', onSourceOpen);
		});
	}
};

const streamMP4 = async (
	client: TelegramClient,
	media: Message['media'],
	mediaSource: MediaSource,
	type: "video"
) => {
	return new Promise<void>((resolve, reject) => {
		const mp4boxfile = MP4Box.createFile();
		let sourceBuffer: SourceBuffer | null = null;

		const fileSize = (media as any).document?.size?.value
			? Number((media as any).document.size.value)
			: Infinity;

		mp4boxfile.onError = (e: any) => {
			console.error('MP4Box error:', e);
			reject(e);
		};

		const queue: BufferSource[] = [];
		let isAppending = false;

		const processQueue = () => {
			if (sourceBuffer && !isAppending && queue.length > 0 && !sourceBuffer.updating) {
				isAppending = true;
				try {
					sourceBuffer.appendBuffer(queue.shift()!);
				} catch (e) {
					console.error('Error appending segment:', e);
				}
			}
		};

		mp4boxfile.onReady = (info) => {
			if (mediaSource.readyState !== 'open') return;
			const durationInSeconds = info.duration / info.timescale;
			mediaSource.duration = durationInSeconds;

			const track = info.tracks.find((t) => t.type === type);
			if (track) {
				const mime = `${type}/mp4; codecs="${track.codec}"`;

				if (MediaSource.isTypeSupported(mime)) {
					try {
						sourceBuffer = mediaSource.addSourceBuffer(mime);
						sourceBuffer.addEventListener('updateend', () => {
							isAppending = false;
							processQueue();
						});
						sourceBuffer.addEventListener('error', (e) => console.error('SourceBuffer error:', e));

						mp4boxfile.setSegmentOptions(track.id, sourceBuffer, { nbSamples: 20 });
						const initSegs = mp4boxfile.initializeSegmentation();
						queue.push(initSegs.buffer);
						processQueue();
						mp4boxfile.start();
					} catch (e) {
						console.error('Error creating SourceBuffer:', e);
					}
				} else {
					console.error('MIME type not supported:', mime);
				}
			} else {
				console.error('No video track found');
			}
		};

		mp4boxfile.onSegment = (
			id,
			user,
			buffer,
			sampleNum,
			is_last
		) => {
			queue.push(buffer);
			processQueue();
			if (is_last) {
				const checkEnd = setInterval(() => {
					if (queue.length === 0 && !sourceBuffer?.updating) {
						clearInterval(checkEnd);
						if (mediaSource.readyState === 'open') {
							mediaSource.endOfStream();
						}
						resolve();
					}
				}, 100);
			}
		};

		const onSourceOpen = async () => {
			if (mediaSource.readyState !== 'open') return;
			mediaSource.removeEventListener('sourceopen', onSourceOpen);

			try {
				const fetchChunk = async (offset: number, size: number): Promise<ArrayBuffer> => {
					for await (const chunk of client.iterDownload({
						file: media as unknown as Api.TypeMessageMedia,
						offset: bigInt(offset),
						requestSize: size,
					})) {
						console.log('fetching')
						console.log('fetching')
						console.log('fetching')
						let arrayBuffer: ArrayBuffer;
						if (chunk instanceof ArrayBuffer) {
							arrayBuffer = chunk;
						} else if (ArrayBuffer.isView(chunk)) {
							arrayBuffer = chunk.buffer.slice(
								chunk.byteOffset,
								chunk.byteOffset + chunk.byteLength
							) as ArrayBuffer;
						} else {
							arrayBuffer = new Uint8Array(chunk as unknown as ArrayLike<number>).buffer;
						}
						return arrayBuffer;
					}
					return new ArrayBuffer(0);
				};

				let currentOffset = 0;
				let processedUpTo = 0;
				const chunkSize = 512 * 1024;

				while (mediaSource.readyState === 'open') {
					const buffer = await fetchChunk(currentOffset, chunkSize);
					if (!buffer || buffer.byteLength === 0) {
						break;
					}

					const mp4Buffer = buffer as ArrayBuffer & { fileStart: number };
					mp4Buffer.fileStart = currentOffset;

					const nextExpectedOffset = mp4boxfile.appendBuffer(mp4Buffer);

					if (currentOffset === processedUpTo) {
						processedUpTo += buffer.byteLength;
					}

					if (typeof nextExpectedOffset === 'number') {
						currentOffset = nextExpectedOffset;
					} else {
						currentOffset = processedUpTo;
					}

					if (fileSize && currentOffset >= fileSize) {
						break;
					}
				}

				mp4boxfile.flush();

			} catch (err) {
				console.error('Error in MP4 streaming:', err);
				if (mediaSource.readyState === 'open') {
					mediaSource.endOfStream('decode');
				}
				reject(err);
			}
		};

		mediaSource.addEventListener('sourceopen', onSourceOpen);
	});
};
