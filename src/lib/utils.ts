import { uploadFile } from '@/actions';
import { fileCacheDb } from '@/lib/dexie';
import Message, { MessageMediaPhoto } from '@/lib/types';
import { type ClassValue, clsx } from 'clsx';
import { ReadonlyURLSearchParams } from 'next/navigation';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { twMerge } from 'tailwind-merge';
import { Api, client, TelegramClient } from 'telegram';
import { EntityLike } from 'telegram/define';
import { RPCError, TypeNotFoundError } from 'telegram/errors';
import { ChannelDetails, User } from './types';

export type MediaSize = 'large' | 'small';
export type MediaCategory = 'video' | 'image' | 'document' | 'audio';

interface DownloadMediaOptions {
	user: NonNullable<User>;
	messageId: number | string;
	size: MediaSize;
	setURL: Dispatch<SetStateAction<string>>;
	category: MediaCategory;
	isShare?: boolean;
}

const TELEGRAM_ERRORS = {
	BOT_PAYMENTS_DISABLED: {
		code: 400,
		description: 'Please enable bot payments in botfather before calling this method.'
	},
	BROADCAST_PUBLIC_VOTERS_FORBIDDEN: {
		code: 400,
		description: "You can't forward polls with public voters."
	},
	BUTTON_DATA_INVALID: {
		code: 400,
		description: 'The data of one or more of the buttons you provided is invalid.'
	},
	BUTTON_TYPE_INVALID: {
		code: 400,
		description: 'The type of one or more of the buttons you provided is invalid.'
	},
	BUTTON_URL_INVALID: { code: 400, description: 'Button URL invalid.' },
	CHANNEL_INVALID: { code: 400, description: 'The provided channel is invalid.' },
	CHANNEL_PRIVATE: { code: 400, description: "You haven't joined this channel/supergroup." },
	CHAT_ADMIN_REQUIRED: { code: 400, description: 'You must be an admin in this chat to do this.' },
	CHAT_FORWARDS_RESTRICTED: {
		code: 400,
		description: "You can't forward messages from a protected chat."
	},
	CHAT_RESTRICTED: {
		code: 400,
		description: "You can't send messages in this chat, you were restricted."
	},
	CHAT_SEND_GIFS_FORBIDDEN: { code: 403, description: "You can't send gifs in this chat." },
	CHAT_SEND_MEDIA_FORBIDDEN: { code: 403, description: "You can't send media in this chat." },
	CHAT_SEND_POLL_FORBIDDEN: { code: 403, description: "You can't send polls in this chat." },
	CHAT_SEND_STICKERS_FORBIDDEN: { code: 403, description: "You can't send stickers in this chat." },
	CHAT_WRITE_FORBIDDEN: { code: 403, description: "You can't write in this chat." },
	CURRENCY_TOTAL_AMOUNT_INVALID: {
		code: 400,
		description: 'The total amount of all prices is invalid.'
	},
	EMOTICON_INVALID: { code: 400, description: 'The specified emoji is invalid.' },
	EXTERNAL_URL_INVALID: { code: 400, description: 'External URL invalid.' },
	FILE_PARTS_INVALID: { code: 400, description: 'The number of file parts is invalid.' },
	FILE_PART_LENGTH_INVALID: { code: 400, description: 'The length of a file part is invalid.' },
	FILE_REFERENCE_EMPTY: { code: 400, description: 'An empty file reference was specified.' },
	FILE_REFERENCE_EXPIRED: {
		code: 400,
		description: 'File reference expired, it must be refetched as described in the documentation.'
	},
	GAME_BOT_INVALID: { code: 400, description: "Bots can't send another bot's game." },
	IMAGE_PROCESS_FAILED: {
		code: 400,
		description: "We're having trouble processing your image. Please try again!"
	},
	INPUT_USER_DEACTIVATED: {
		code: 400,
		description:
			"The user you're trying to interact with has deactivated their account. Please try again!"
	},
	MD5_CHECKSUM_INVALID: { code: 400, description: 'The MD5 checksums do not match.' },
	MEDIA_CAPTION_TOO_LONG: { code: 400, description: 'The caption is too long.' },
	MEDIA_EMPTY: { code: 400, description: 'The provided media object is invalid.' },
	MEDIA_INVALID: { code: 400, description: 'Media invalid.' },
	MSG_ID_INVALID: { code: 400, description: 'Invalid message ID provided.' },
	PAYMENT_PROVIDER_INVALID: {
		code: 400,
		description: 'The specified payment provider is invalid.'
	},
	PEER_ID_INVALID: { code: 400, description: 'The provided peer id is invalid.' },
	PHOTO_EXT_INVALID: { code: 400, description: 'The extension of the photo is invalid.' },
	PHOTO_INVALID_DIMENSIONS: { code: 400, description: 'The photo dimensions are invalid.' },
	PHOTO_SAVE_FILE_INVALID: { code: 400, description: 'Internal issues, try again later.' },
	POLL_ANSWERS_INVALID: { code: 400, description: 'Invalid poll answers were provided.' },
	POLL_ANSWER_INVALID: { code: 400, description: 'One of the poll answers is not acceptable.' },
	POLL_OPTION_DUPLICATE: { code: 400, description: 'Duplicate poll options provided.' },
	POLL_OPTION_INVALID: { code: 400, description: 'Invalid poll option provided.' },
	POLL_QUESTION_INVALID: { code: 400, description: 'One of the poll questions is not acceptable.' },
	QUIZ_CORRECT_ANSWERS_EMPTY: { code: 400, description: 'No correct quiz answer was specified.' },
	QUIZ_CORRECT_ANSWERS_TOO_MUCH: {
		code: 400,
		description:
			'You specified too many correct answers in a quiz, quizzes can only have one right answer!'
	},
	QUIZ_CORRECT_ANSWER_INVALID: {
		code: 400,
		description: 'An invalid value was provided to the correct_answers field.'
	},
	QUIZ_MULTIPLE_INVALID: {
		code: 400,
		description: "Quizzes can't have the multiple_choice flag set!"
	},
	RANDOM_ID_DUPLICATE: {
		code: 500,
		description: 'You provided a random ID that was already used.'
	},
	REPLY_MARKUP_BUY_EMPTY: { code: 400, description: 'Reply markup for buy button empty.' },
	REPLY_MARKUP_INVALID: { code: 400, description: 'The provided reply markup is invalid.' },
	SCHEDULE_BOT_NOT_ALLOWED: { code: 400, description: 'Bots cannot schedule messages.' },
	SCHEDULE_DATE_TOO_LATE: {
		code: 400,
		description: "You can't schedule a message this far in the future."
	},
	SCHEDULE_TOO_MUCH: { code: 400, description: 'There are too many scheduled messages.' },
	SEND_AS_PEER_INVALID: {
		code: 400,
		description: "You can't send messages as the specified peer."
	},
	SLOWMODE_WAIT: {
		code: 420,
		description:
			'Slowmode is enabled in this chat: wait %d seconds before sending another message to this chat.'
	},
	TTL_MEDIA_INVALID: { code: 400, description: 'Invalid media Time To Live was provided.' },
	USER_BANNED_IN_CHANNEL: {
		code: 400,
		description: "You're banned from sending messages in supergroups/channels."
	},
	USER_IS_BLOCKED: { code: 403, description: 'You were blocked by this user.' },
	USER_IS_BOT: { code: 400, description: "Bots can't send messages to other bots." },
	VIDEO_CONTENT_TYPE_INVALID: { code: 400, description: "The video's content type is invalid." },
	WEBPAGE_CURL_FAILED: { code: 400, description: 'Failure while fetching the webpage with cURL.' },
	WEBPAGE_MEDIA_EMPTY: { code: 400, description: 'Webpage media empty.' },
	YOU_BLOCKED_USER: { code: 400, description: 'You blocked this user.' }
} as const;

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number) {
	const KB = 1024;
	const MB = KB * 1024;
	const GB = MB * 1024;

	if (bytes < KB) return `${bytes} Bytes`;
	if (bytes < MB) return `${(bytes / KB).toFixed(2)} KB`;
	if (bytes < GB) return `${(bytes / MB).toFixed(2)} MB`;

	return `${(bytes / GB).toFixed(2)} GB`;
}

export async function uploadFiles(
	formData: FormData,
	user: User,
	onProgress: Dispatch<
		SetStateAction<
			| {
				itemName: string;
				itemIndex: number;
				progress: number;
				total: number
			}
			| undefined
		>
	>,
	client: TelegramClient | undefined,
	folderId: string | null,
) {
	if (!client) {
		throw new Error('Failed to initialize Telegram client');
	}

	if (!client.connected) await client.connect();

	const files = formData.getAll('files') as File[];
	try {
		for (let index = 0; index < files.length; index++) {
			const file = files[index];
			const toUpload = await client.uploadFile({
				file: file,
				workers: 5,
				onProgress: (progress) => {
					onProgress({
						itemName: file.name,
						itemIndex: index,
						progress: progress,
						total: files.length
					});
				}
			});

			const me = await client.getMe();

			const channelId = user?.channelId!.startsWith('-100')
				? user?.channelId!
				: `-100${user?.channelId!}`;
			const entity = await client.getInputEntity(channelId);

			const result = await client.sendFile(entity, {
				file: toUpload,
				forceDocument: false
			});

			const uploadToDbResult = await uploadFile({
				fileName: file.name,
				mimeType: file.type,
				size: BigInt(file.size),
				url: !user?.hasPublicTgChannel
					? `https://t.me/c/${user?.channelId}/${result?.id}`
					: `https://t.me/${user?.channelUsername}/${result?.id}`,
				fileTelegramId: result.id,
				folderId
			});
		}
	} catch (err) {
		if (err instanceof RPCError) {
			const descreption =
				TELEGRAM_ERRORS[err.errorMessage as keyof typeof TELEGRAM_ERRORS].description;
			toast.error(descreption);
		}
	} finally {
		await client.disconnect();
	}
}

export async function delelteItem(
	user: User,
	postId: number | string | (string | number)[],
	client: TelegramClient | undefined
) {
	if (!client) {
		toast.error('Failed to initialize Telegram client');
		return;
	}

	if (!client.connected) await client.connect();

	try {
		const channelId = user?.channelId!.startsWith('-100')
			? user?.channelId!
			: `-100${user?.channelId!}`;
		const entity = await client.getInputEntity(channelId);

		const deleteMediaStatus = await client.deleteMessages(
			entity,
			Array.isArray(postId) ? postId.map(Number) : [Number(postId)],
			{
				revoke: true
			}
		);
		return deleteMediaStatus;
	} catch (err) {
		if (err instanceof Error) {
			throw new Error(err.message);
		}
		if (err instanceof TypeNotFoundError) {
			throw new Error(err.message);
		}
		if (err && typeof err == 'object' && 'message' in err) {
			throw new Error(err.message as string);
		}
		return null;
	} finally {
		await client.disconnect();
	}
}

export async function getChannelDetails(client: TelegramClient, username: string) {
	if (!client) throw new Error('Telegram client is not initialized');
	const entity = (await client.getEntity(username)) as unknown as ChannelDetails & {
		id: { value: string };
		broadcast: boolean;
		creator: any;
	};

	const channelDetails: Partial<ChannelDetails> = {
		title: entity.title,
		username: entity.username,
		channelusername: entity.id.value,
		isCreator: entity.creator,
		isBroadcast: entity.broadcast
	};

	client.disconnect();
	return channelDetails;
}

export function useCreateQueryString(
	searchParams: ReadonlyURLSearchParams
): (name: string, value: string) => string {
	return (name: string, value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set(name, value);
		return params.toString();
	};
}

export const getChannelEntity = (channelId: string, accessHash: string) => {
	return new Api.InputChannel({
		//@ts-ignore
		channelId: channelId,
		//@ts-ignore
		accessHash: accessHash
	});
};

export function getBannerURL(filename: string, isDarkMode: boolean) {
	const width = 600;
	const height = 500;
	const lightBackgroundColor = 'ffffff';
	const lightTextColor = '000000';
	const darkBackgroundColor = '000000';
	const darkTextColor = 'ffffff';

	const backgroundColor = isDarkMode ? darkBackgroundColor : lightBackgroundColor;
	const textColor = isDarkMode ? darkTextColor : lightTextColor;

	const bannerUrl = `https://via.placeholder.com/${width}x${height}/${backgroundColor}/${textColor}?text=${filename}`;
	return bannerUrl;
}

export function isDarkMode() {
	return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export const canWeAccessTheChannel = async (client: TelegramClient, user: User) => {
	const channelId = user?.channelId?.startsWith('-100')
		? user?.channelId
		: `-100${user?.channelId}`;
	try {
		const entity = await client.getInputEntity(channelId as EntityLike);
		return !!entity;
	} catch (err) {
		if (err instanceof RPCError) {
			if (err.errorMessage == 'CHANNEL_INVALID') return false;
		}
	}
};

export const getMessage = async ({
	messageId,
	client,
	user
}: Pick<DownloadMediaOptions, 'messageId' | 'user'> & {
	client: TelegramClient;
}) => {
	if (!client.connected) await client.connect();
	const channelId = user?.channelId as string;

	const result = (
		(await client.getMessages(channelId, {
			ids: [Number(messageId)]
		})) as unknown as Message[]
	)[0];

	if (!result) return null;

	const media = result.media as Message['media'] | MessageMediaPhoto;
	return media;
};

export const getCacheKey = (
	channelId: string,
	messageId: number | string,
	category: MediaCategory
) => {
	const fileSmCacheKey = `${channelId}-${messageId}-${'small' satisfies MediaSize}-${category}`;
	const fileLgCacheKey = `${channelId}-${messageId}-${'large' satisfies MediaSize}-${category}`;
	return { fileSmCacheKey, fileLgCacheKey };
};

export const removeCachedFile = async (cacheKey: string) => {
	await fileCacheDb.fileCache.where('cacheKey').equals(cacheKey).delete();
};

async function getCachedFile(cacheKey: string) {
	return await fileCacheDb.fileCache.where('cacheKey').equals(cacheKey).first();
}

export const downloadMedia = async (
	{ user, messageId, size, setURL, category, isShare }: DownloadMediaOptions,
	client: TelegramClient | 'CONNECTING' | null
): Promise<Blob | { fileExists: boolean } | null> => {
	if (!user || !client || !user.channelId || !user.accessHash)
		throw new Error('failed to get user');

	const { fileLgCacheKey, fileSmCacheKey } = getCacheKey(user.channelId, messageId, category);
	const fileLg = await getCachedFile(fileLgCacheKey);
	if (fileLg) {
		const blob = fileLg.data;
		const url = URL.createObjectURL(blob);
		setURL(url);
		return blob;
	}

	const fileSm = await getCachedFile(fileSmCacheKey);
	if (fileSm) {
		const blob = fileSm.data;
		const url = URL.createObjectURL(blob);
		setURL(url);
	}

	if (typeof client === 'string') return null;

	const media = await getMessage({ client, messageId, user });
	if (!media) return { fileExists: false };

	try {
		if (category === 'video')
			return await handleVideoDownload(client, media as Message['media'], async (chunk) => { });
		if (media)
			return await handleMediaDownload(
				client,
				media,
				size,
				size === 'large' ? fileLgCacheKey : fileSmCacheKey,
				setURL
			);
	} catch (err) {
		console.error(err);
	}

	return null;
};

export const handleVideoDownload = async (
	client: TelegramClient,
	media: Message['media'],
	setURL: Dispatch<SetStateAction<string | undefined>>
) => {
	for await (const buffer of client.iterDownload({
		file: media as unknown as Api.TypeMessageMedia,
		requestSize: 3 * 1024 * 1024 // 3MB
	})) {
		const blob = new Blob([buffer as unknown as Buffer]);
		const url = URL.createObjectURL(blob);
		setURL(url);
		break;
	}

	return null;
};

export const handleMediaDownload = async (
	client: TelegramClient,
	media: Message['media'] | MessageMediaPhoto,
	size: MediaSize,
	cacheKey: string,
	setURL: Dispatch<SetStateAction<string>>
): Promise<Blob | null> => {
	const buffer = await client.downloadMedia(media as unknown as Api.TypeMessageMedia, {
		progressCallback: (progress, total) => {
			const percent = (Number(progress) / Number(total)) * 100;
		},
		thumb: size === 'small' ? 0 : undefined
	});

	const blob = new Blob([buffer as unknown as Buffer]);

	fileCacheDb.fileCache.add({
		id: Date.now(),
		data: blob,
		cacheKey
	});

	setURL(URL.createObjectURL(blob));
	return blob;
};

export const downloadVideoThumbnail = async (
	user: User,
	client: TelegramClient,
	media: Message['media']
) => {
	const thumbnail = media.document.thumbs;
	if (!thumbnail) return;

	const buffer = await client.downloadMedia(media as unknown as Api.TypeMessageMedia, {
		thumb: 1
	});
	if (!buffer) return;
	return buffer;
};


export async function generateVideoThumbnail(client: TelegramClient, media: Message['media']) {
	const buffers = [];
	for await (const buffer of client.iterDownload({
		file: media as unknown as Api.TypeMessageMedia,
		requestSize: 1 * 1024 * 1024
	})) {
		buffers.push(buffer);
		break;
	}

	const blob = new Blob(buffers, { type: 'video/mp4' });
	const video = document.createElement('video');
	video.src = URL.createObjectURL(blob);
	video.crossOrigin = 'anonymous';
	video.preload = 'metadata';
	video.muted = true;
	video.playsInline = true;

	await new Promise(resolve => {
		video.onloadedmetadata = () => {
			video.currentTime = Math.min(1, video.duration / 2);
			resolve(void 0);
		};
	});

	await new Promise(resolve => {
		video.onseeked = () => resolve(void 0);
	});


	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;

	ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

	const thumbnail = canvas.toDataURL('image/jpeg', 0.9);
	return thumbnail;
}	