
import { Api, TelegramClient } from 'telegram';
import { Dispatch, SetStateAction } from 'react';
import Message from '@/lib/types';
import * as MP4Box from 'mp4box';
import bigInt from 'big-integer';

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

export const streamVideoToMediaSource = async (
	client: TelegramClient,
	media: Message['media'],
	mimeType: string,
	setURL: Dispatch<SetStateAction<string | undefined>>
) => {
	const mediaSource = new MediaSource();
	const url = URL.createObjectURL(mediaSource);
	setURL(url);

	if (mimeType === 'video/webm') {
		return streamWebM(client, media, mediaSource, mimeType);
	}

	return streamMP4(client, media, mediaSource);
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
					requestSize: 512 * 1024,
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

const streamMP4 = async (
	client: TelegramClient,
	media: Message['media'],
	mediaSource: MediaSource
) => {
	return new Promise<void>((resolve, reject) => {
		const mp4boxfile = MP4Box.createFile();
		let sourceBuffer: SourceBuffer | null = null;

		// Metadata / State
		const fileSize = (media as any).document?.size?.value 
			? Number((media as any).document.size.value) 
			: Infinity;
		
		let isReady = false;

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
			console.log('[Stream] MP4Box onReady', info);
			isReady = true;
			if (mediaSource.readyState !== 'open') return;

			const track = info.tracks.find((t) => t.type === 'video');
			if (track) {
				const mime = `video/mp4; codecs="${track.codec}"`;
				console.log('[Stream] Found video track', track);
				if (MediaSource.isTypeSupported(mime)) {
					try {
						sourceBuffer = mediaSource.addSourceBuffer(mime);
						console.log('[Stream] Added SourceBuffer', mime);
						sourceBuffer.addEventListener('updateend', () => {
							isAppending = false;
							processQueue();
						});
						sourceBuffer.addEventListener('error', (e) => console.error('SourceBuffer error:', e));

						mp4boxfile.setSegmentOptions(track.id, sourceBuffer, { nbSamples: 20 });
						const initSegs = mp4boxfile.initializeSegmentation();
						console.log('[Stream] Initialized segmentation');
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
			console.log('[Stream] onSegment', { id, sampleNum, is_last, byteLength: buffer.byteLength });
			queue.push(buffer);
			processQueue();
			// If we reached the end of the stream via segments
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
				// Helper to fetch a specific chunk
				const fetchChunk = async (offset: number, size: number): Promise<ArrayBuffer> => {
					console.log(`[Stream] Fetching chunk: offset=${offset}, size=${size}`);
					for await (const chunk of client.iterDownload({
						file: media as unknown as Api.TypeMessageMedia,
						offset: bigInt(offset),
						requestSize: size,
						// We only want one chunk, but iterDownload is an iterator. 
						// 'limit' might count messages or chunks depending on impl, 
						// but usually just breaking after first chunk is safest for "one chunk".
					})) {
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
						// We only return the first valid chunk
						return arrayBuffer;
					}
					return new ArrayBuffer(0);
				};

				// Main streaming loop
				// We start at 0.
				// If MP4Box asks for something far ahead (moov), we jump there.
				// Once ready, we ensure we stream linearly from start (or catch up).
				
				let currentOffset = 0;
				// If we jumped to fetch metadata, we remember where we left off to resume "main" streaming
				let processedUpTo = 0; 
				const chunkSize = 1024 * 1024; // 1MB chunks

				while (mediaSource.readyState === 'open') {
					// 1. Fetch chunk at currentOffset
					const buffer = await fetchChunk(currentOffset, chunkSize);
					if (!buffer || buffer.byteLength === 0) {
						console.log('[Stream] No more data (EOF).');
						break;
					}

					// 2. Prepare buffer for MP4Box
					const mp4Buffer = buffer as ArrayBuffer & { fileStart: number };
					mp4Buffer.fileStart = currentOffset;

					// 3. Append to MP4Box
					const nextExpectedOffset = mp4boxfile.appendBuffer(mp4Buffer);
					
					// Update where we have comfortably processed up to (sequentially)
					if (currentOffset === processedUpTo) {
						processedUpTo += buffer.byteLength;
					}

					console.log(`[Stream] Appended ${buffer.byteLength} bytes at ${currentOffset}. Next expected: ${nextExpectedOffset}`);

					// 4. Decide next move
					// If MP4Box is NOT ready and asking for a far offset (likely moov at end)
					if (!isReady && nextExpectedOffset > processedUpTo + 1000000) { // arbitrary threshold for "far"
						console.log('[Stream] MP4Box needs data far ahead (metadata search). Jumping...');
						currentOffset = nextExpectedOffset;
						// Note: We don't change 'processedUpTo' because we still need to fill the gap later.
					} else {
						// Otherwise, just continue sequentially from where we left off
						currentOffset = processedUpTo;
					}

					// Safety check for EOF based on known file size
					if (fileSize && currentOffset >= fileSize) {
						console.log('[Stream] Reached end of file size.');
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
