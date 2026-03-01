
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
	mediaSource: MediaSource,
	signal: AbortSignal
}

export const streamMedia = async (
	{ client, media, mimeType, mediaSource, signal, }: StreamMediaArgs,
	onError: (error: unknown) => void
) => {
	try {
		if (mimeType.startsWith('audio/') && !mimeType.includes('mp4') && !mimeType.includes('m4a')) {
			return streamDirectAudio(client, media, mimeType, mediaSource, signal, onError);
		}

		if (mimeType === 'video/webm') {
		return streamWebM(client, media, mediaSource, mimeType, signal, onError);
	}

	return streamMP4(client, media, mediaSource, signal, onError);
	} catch (err) {
		onError(err)
		console.error('err', err)
	}
};

const streamWebM = async (
	client: TelegramClient,
	media: Message['media'],
	mediaSource: MediaSource,
	mimeType: string,
	signal: AbortSignal,
	onError: (error: unknown) => void
) => {
	signal.throwIfAborted()
	const codec = getVideoCodec(mimeType);

	return new Promise<void>((resolve, reject) => {
		signal.addEventListener('abort', () => {
			console.log('aborting');
			if (mediaSource.readyState === 'open') {
				mediaSource.endOfStream();
			}
			reject(new DOMException('Aborted', 'AbortError'));
		});
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
							const buf = queue.shift();
							if (buf) sourceBuffer.appendBuffer(buf);
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
				onError(err);
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
	mediaSource: MediaSource,
	signal: AbortSignal,
	onError: (error: unknown) => void
) => {
	signal.throwIfAborted()
	if (MediaSource.isTypeSupported(mimeType)) {
		return new Promise<void>((resolve, reject) => {
			signal.addEventListener('abort', () => {
				console.log('aborting');
				if (mediaSource.readyState === 'open') {
					mediaSource.endOfStream();
				}
				reject(new DOMException('Aborted', 'AbortError'));
			});
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
								const buf = queue.shift();
								if (buf) sourceBuffer.appendBuffer(buf as BufferSource);
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
					onError(err);
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
	signal: AbortSignal,
	onError: (error: unknown) => void
) => {
	signal.throwIfAborted();

	return new Promise<void>((resolve, reject) => {
		const mp4boxfile = MP4Box.createFile();
		const sourceBuffers: Record<number, SourceBuffer> = {};
		const queue: Array<{ id: number; buffer: ArrayBuffer }> = [];

		let isAppending = false;
		let isEnded = false;


		let fileSize = Infinity;
		if (media && 'document' in media && media.document && 'size' in media.document) {
			const size = media.document.size;
			if (typeof size === 'object' && 'value' in size) {
				fileSize = Number(size.value);
			} else if (typeof size === 'number') {
				fileSize = size;
			} else if (typeof size === 'string') {
				fileSize = Number(size);
			}
		}

		const safeEndStream = (error?: EndOfStreamError) => {
			if (
				!isEnded &&
				mediaSource.readyState === "open" &&
				Object.values(sourceBuffers).every(sb => !sb.updating)
			) {
				isEnded = true;
				mediaSource.endOfStream(error);
			}
		};

		const processQueue = () => {
			if (isAppending) return;
			if (queue.length === 0) return;

			const item = queue.shift();
			if (!item) return;
			const sb = sourceBuffers[item.id];
			if (!sb || sb.updating || mediaSource.readyState !== "open") return;

			isAppending = true;
			try {
				sb.appendBuffer(item.buffer);
			} catch (e) {
				console.error("Append error:", e);
			}
		};

		const attachUpdateEnd = (sb: SourceBuffer) => {
			sb.addEventListener("updateend", () => {
				isAppending = false;
				processQueue();
			});
		};


		signal.addEventListener("abort", () => {
			try {
				safeEndStream();
			} catch { }
			reject(new DOMException("Aborted", "AbortError"));
		});

		mp4boxfile.onError = (e) => {
			console.error("MP4Box error:", e);
			safeEndStream("decode");
			onError(e);
			reject(e);
		};

		mp4boxfile.onReady = (info) => {
			if (mediaSource.readyState !== "open") return;
			mediaSource.duration = info.duration / info.timescale;
			for (const track of info.tracks) {
				const mime = `${track.type}/mp4; codecs="${track.codec}"`;

				if (!MediaSource.isTypeSupported(mime)) {
					console.warn("Unsupported MIME:", mime);
					continue;
				}

				const sb = mediaSource.addSourceBuffer(mime);
				sourceBuffers[track.id] = sb;
				attachUpdateEnd(sb);

				mp4boxfile.setSegmentOptions(track.id, null, {
					nbSamples: 100,
				});
			}

			const initSegs = mp4boxfile.initializeSegmentation();
			initSegs.forEach((seg: any) => {
				queue.push({ id: seg.id, buffer: seg.buffer });
			});

			processQueue();
			mp4boxfile.start();
		};

		mp4boxfile.onSegment = (
			id: number,
			user: any,
			buffer: ArrayBuffer,
			sampleNum: number,
			isLast: boolean
		) => {
			queue.push({ id, buffer });
			processQueue();

			if (isLast) {
				const interval = setInterval(() => {
					if (
						queue.length === 0 &&
						Object.values(sourceBuffers).every(sb => !sb.updating)
					) {
						clearInterval(interval);
						safeEndStream();
						resolve();
					}
				}, 50);
			}
		};

		const onSourceOpen = async () => {
			mediaSource.removeEventListener("sourceopen", onSourceOpen);

			let offset = 0;
			const chunkSize =
				fileSize < 50 * 1024 * 1024
					? 1 * 1024 * 1024
					: fileSize < 200 * 1024 * 1024
						? 5 * 1024 * 1024
						: 10 * 1024 * 1024;

			try {
				while (offset < fileSize && mediaSource.readyState === "open") {
					let received = false;

					for await (const chunk of client.iterDownload({
						file: media as unknown as Api.TypeMessageMedia,
						offset: bigInt(offset),
						requestSize: chunkSize,
					})) {
						const arrayBuffer =
							chunk instanceof ArrayBuffer
								? chunk
								: ArrayBuffer.isView(chunk)
									? chunk.buffer.slice(
										chunk.byteOffset,
										chunk.byteOffset + chunk.byteLength
									)
									: new Uint8Array(chunk as any).buffer;

						const mp4Buffer = arrayBuffer as ArrayBuffer & {
							fileStart: number;
						};
						mp4Buffer.fileStart = offset;

						offset += arrayBuffer.byteLength;
						mp4boxfile.appendBuffer(mp4Buffer);
						received = true;
						break;
					}

					if (!received) break;
				}

				mp4boxfile.flush();
			} catch (err) {
				onError(err);
				console.error("Streaming error:", err);
				safeEndStream("decode");
				reject(err);
			}
		};

		mediaSource.addEventListener("sourceopen", onSourceOpen);
	});
};


