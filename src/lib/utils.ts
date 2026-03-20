import { uploadFile } from '@/actions';
import { fileCacheDb } from '@/lib/dexie';
import Message, { FileItem, MessageMediaPhoto } from '@/lib/types';
import { UploadProgress } from '@/store/global-store';
import { type ClassValue, clsx } from 'clsx';
import { ReadonlyURLSearchParams } from 'next/navigation';
import { twMerge } from 'tailwind-merge';
import { Api, TelegramClient } from 'telegram';
import { EntityLike } from 'telegram/define';
import { RPCError } from 'telegram/errors';
import { TELEGRAM_ERRORS } from './consts';
import { getCode, getPassword, getPhoneNumber } from './telegramAuthHelpers';
import { ChannelDetails, User } from './types';
import { toast } from 'sonner';

export type MediaSize = 'large' | 'small';
export type MediaCategory = 'video' | 'image' | 'document' | 'audio';

export function getMediaCategory(mimeType: string): MediaCategory {
	if (mimeType.startsWith('image/')) return 'image';
	if (mimeType.startsWith('video/')) return 'video';
	if (mimeType.startsWith('audio/')) return 'audio';
	return 'document';
}

export const telegramErrorMessagesThatNeedReLogin = ["SESSION_REVOKED", "AUTH_KEY_DUPLICATED", "AUTH_KEY_UNREGISTERED", "AUTH_KEY_INVALID", "USER_DEACTIVATED", "SESSION_EXPIRED"]

export const QUERY_KEYS = {
	audio: (id: number) => `${"audio-media-view-" as const}${id}` as const,
	video: (id: number) => `${"video-media-view-" as const}${id}` as const,
	image: (id: number) => `${"image-media-view-" as const}${id}` as const,
	document: (id: number) => `${"document-media-view-" as const}${id}` as const,
}
interface DownloadMediaOptions {
	user: NonNullable<User>;
	messageId: number | string;
	size: MediaSize;
	mimeType: string | undefined
	category: MediaCategory;
	isShare?: boolean;
}

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
	onProgress: (progress: UploadProgress) => void | undefined,
	client: TelegramClient | undefined,
	folderId: string | null
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
					onProgress?.({
						itemName: file.name,
						itemIndex: index,
						progress: progress,
						total: files.length
					});
				}
			});

			if (!user || !user.channelId) throw new Error('User channel ID is missing');
			const channelId = user.channelId;
			const normalizedId = channelId.startsWith('-100')
				? channelId
				: `-100${channelId}`;
			const entity = await client.getInputEntity(normalizedId);

			const result = await client.sendFile(entity, {
				file: toUpload,
				forceDocument: !file.type.startsWith('audio')
			});

			await uploadFile({
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

export async function deleteItem(
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
		if (!user || !user.channelId) throw new Error('User channel ID is missing');
		const channelId = user.channelId;
		const normalizedId = channelId.startsWith('-100')
			? channelId
			: `-100${channelId}`;

		const entity = await client.getInputEntity(normalizedId);
		const affectedMessages = await client.deleteMessages(
			entity,
			Array.isArray(postId) ? postId.map(Number) : [Number(postId)],
			{
				revoke: true
			}
		);
		return affectedMessages;
	} catch (err) {
		throw err
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



const filePlaceholderObj = {
	image: '/image-placeholder.png',
	document: '/generic-document-placeholder.png',
	pdf: '/pdf-placeholder.png',
	audio: '/audio-placeholder.svg',
	video: '/video-placeholder.png'
};

export const getFilePlaceholder = (file: Pick<FileItem, "category" | "mimeType">) => {
	if (file.mimeType.startsWith('image')) return filePlaceholderObj.image;
	if (file.mimeType === 'application/pdf') return filePlaceholderObj.pdf;
	if (file.mimeType.startsWith('application')) return filePlaceholderObj.document;
	if (file.mimeType.startsWith('audio') || file.category === 'audio') return filePlaceholderObj.audio;
	if (file.mimeType.startsWith('video') || file.category === 'video') return filePlaceholderObj.video;
	return filePlaceholderObj.document;
};

export function isDarkMode() {
	return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export const canWeAccessTheChannel = async (client: TelegramClient, user: User) => {
	try {
		const channelId = user?.channelId?.startsWith('-100')
			? user?.channelId
			: `-100${user?.channelId}`;
		const entity = await client.getInputEntity(channelId as EntityLike);
		return !!entity;
	} catch (err) {
		throw Error("CHANNEL_INVALID")
	}
};


export async function loginInTelegram(clientInstance: TelegramClient | undefined) {
	try {
		if (!clientInstance) return;

		let errCount = 0
		await clientInstance?.start({
			phoneNumber: async () => await getPhoneNumber(),
			password: async () => await getPassword(),
			phoneCode: async () => await getCode(),
			onError: (err) => {
				console.error('Telegram login error:', err)
				toast.error(err?.message)
				if (errCount >= 3) {
					throw err
				}
				errCount++
			}
		});

		const session = clientInstance?.session.save() as unknown as string;
		return session;
	} catch (err) {
		console.error('Error in loginInTelegram:', err);
		if (err && typeof err == 'object' && 'message' in err) {
			const message = (err?.message as string) ?? 'There was an error';
			toast.error(message);
		}
		return undefined;
	}
}

export const getMessage = async ({
	messageId,
	client,
	user
}: Pick<DownloadMediaOptions, 'messageId' | 'user'> & {
		client: TelegramClient
}) => {
	if (!client.connected) await client.connect();

	const channelId = user?.channelId?.startsWith('-100')
		? user?.channelId
		: `-100${user?.channelId}`;

	const entity = await client.getInputEntity(channelId as EntityLike);

	const result = (
		(await client.getMessages(entity, {
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
	if (category == 'image') {
		const fileSmCacheKey = `${channelId}-${messageId}-${'small' satisfies MediaSize}-${category}`;
		const fileLgCacheKey = `${channelId}-${messageId}-${'large' satisfies MediaSize}-${category}`;
		return { fileSmCacheKey, fileLgCacheKey };
	}
};

export const removeCachedFile = async (cacheKey: string) => {
	await fileCacheDb.fileCache.where('cacheKey').equals(cacheKey).delete();
};

async function getCachedFile(cacheKey: string) {
	return await fileCacheDb.fileCache.where('cacheKey').equals(cacheKey).first();
}

export const downloadMedia = async (
	{ user, messageId, size, mimeType, category }: DownloadMediaOptions,
	client: TelegramClient | 'CONNECTING' | null
): Promise<{ blob?: Blob, url?: string, notFound?: boolean } | null> => {
	if (!user || !client || !user.channelId || !user.accessHash)
		throw new Error('failed to get user');

	const cacheKeys = getCacheKey(user.channelId, messageId, category);
	if (cacheKeys) {
		const { fileLgCacheKey, fileSmCacheKey } = cacheKeys
		const fileLg = await getCachedFile(fileLgCacheKey);
		if (fileLg && size === 'large') {
			const blob = fileLg.data;
			const url = URL.createObjectURL(blob);
			return { blob, url }
		}

		const fileSm = await getCachedFile(fileSmCacheKey);
		if (fileSm && size === 'small') {
			const blob = fileSm.data;
			const url = URL.createObjectURL(blob);
			return { blob, url }
		}
	}

	if (typeof client === 'string') return null;
	const media = await getMessage({ client, messageId, user });
	if (!media) return { notFound: true, blob: undefined, url: undefined };

	try {
		if (media)
			return await handleMediaDownload(
				client,
				media,
				size,
				category == "image" ? (size === 'large' ? cacheKeys?.fileLgCacheKey : cacheKeys?.fileSmCacheKey) : undefined,
				mimeType
			);
	} catch (err) {
		console.error(err);
	}
	return null;
};

export const handleMediaDownload = async (
	client: TelegramClient,
	media: Message['media'] | MessageMediaPhoto,
	size: MediaSize,
	cacheKey?: string,
	mimeType?: string
): Promise<{ blob: Blob, url: string } | null> => {
	const buffer = await client.downloadMedia(media as unknown as Api.TypeMessageMedia, {
		thumb: size === 'small' ? 0 : undefined
	});
	const blob = new Blob([buffer as BlobPart], (mimeType ? { type: mimeType } : undefined));
	if (cacheKey) {
		fileCacheDb.fileCache.add({
			id: Date.now(),
			data: blob,
			cacheKey: cacheKey
		});
	}

	return { blob, url: URL.createObjectURL(blob) };
};

export const downloadVideoThumbnail = async (
	client: TelegramClient,
	media: Message['media']
) => {
	if (!('document' in media) || !media.document) return;
	const thumbs = media.document.thumbs;
	if (!thumbs || thumbs.length === 0) return;

	let largestIndex = 0;
	let largestArea = 0;
	for (let i = 0; i < thumbs.length; i++) {
		const t = thumbs[i] as { w?: number; h?: number };
		const area = (t.w ?? 0) * (t.h ?? 0);
		if (area > largestArea) {
			largestArea = area;
			largestIndex = i;
		}
	}

	const buffer = await client.downloadMedia(media as unknown as Api.TypeMessageMedia, {
		thumb: largestIndex
	});
	if (!buffer) return;
	const blob = new Blob([buffer as BlobPart]);
	return { blob, url: URL.createObjectURL(blob) };
};
