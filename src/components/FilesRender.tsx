'use client';
import { deleteChannelDetail, deleteFile, shareFile } from '@/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getGlobalTGCloudContext } from '@/lib/context';
import { fileCacheDb } from '@/lib/dexie';
import { getTgClient } from '@/lib/getTgClient';
import { promiseToast } from '@/lib/notify';
import { withTelegramConnection } from '@/lib/telegramMutex';
import Message, { FileItem, FilesData, GetAllFilesReturnType, User } from '@/lib/types';
import {
	canWeAccessTheChannel,
	delelteItem,
	downloadMedia,
	downloadVideoThumbnail,
	formatBytes,
	generateVideoThumbnail,
	getBannerURL,
	getCacheKey,
	getMessage,
	handleVideoDownload,
	isDarkMode,
	MediaCategory,
	MediaSize,
	removeCachedFile
} from '@/lib/utils';
import fluidPlayer from 'fluid-player';
import { Play, Share2, TrashIcon, Minimize2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
	CloudDownload,
	ImageIcon,
	Trash2Icon,
	VideoIcon,
	Music2Icon as AudioIcon
} from './Icons/icons';
import FileContextMenu from './fileContextMenu';
import { FileModalView } from './fileModalView';
import Upload from './uploadWrapper';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '@/components/ui/alert-dialog';

import Swal from 'sweetalert2';
import { TelegramClient } from 'telegram';
import React from 'react';

export function showSharableURL(url: string) {
	Swal.fire({
		title: 'Your Sharable Link',
		html: `
      <div>
        <input id="sharable-url" class="swal2-input" value="${url}" readonly>
        <button id="copy-button" class="swal2-confirm swal2-styled" style="margin-top: 10px;">Copy Link</button>
      </div>
    `,
		showConfirmButton: false,
		didOpen: () => {
			const copyButton = document.getElementById('copy-button');
			const sharableUrlInput = document.getElementById('sharable-url') as HTMLInputElement;

			copyButton?.addEventListener('click', async () => {
				sharableUrlInput.select();
				const sharableURL = sharableUrlInput?.value;
				try {
					await navigator.clipboard.writeText(sharableURL);
					Swal.fire({
						icon: 'success',
						title: 'Copied!',
						showConfirmButton: false,
						timer: 1500
					});
				} catch (err) {
					console.error(err);
				}
			});
		}
	});
}

function Files({
	user,
	files
}: {
	user: User;
	mimeType?: string;
	files: NonNullable<GetAllFilesReturnType>['files'] | undefined;
	folders: NonNullable<GetAllFilesReturnType>['folders'] | undefined;
	currentFolderId: string | null;
}) {
	const tGCloudGlobalContext = getGlobalTGCloudContext();
	const sortBy = tGCloudGlobalContext?.sortBy;
	const [canWeAccessTGChannel, setCanWeAccessTGChannel] = useState<boolean | 'INITIAL'>('INITIAL');
	const [client, setTelegramClient] = useState<TelegramClient | null>(null);

	const [isConnecting, setIsConnecting] = useState(false);
	const [isError, setIsError] = useState(false);

	const router = useRouter();
	const [selectedFiles, setSelectedFiles] = useState<typeof files>([]);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const stableUser = useMemo(() => user, [user?.name]);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const stableClient = useMemo(() => client, [client?.connected]);

	const sortedFileKey = (Array.isArray(files) ? files?.map((file) => file.id) : []).join('-');

	const sortedFiles = useMemo(() => {
		if (!files || !Array.isArray(files) || files.length === 0) return [];
		if (sortBy === 'name') return [...files].sort((a, b) => a.fileName.localeCompare(b.fileName));
		if (sortBy === 'date')
			return [...files].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
		if (sortBy === 'size') return [...files].sort((a, b) => Number(a.size) - Number(b.size));
		return [...files].sort((a, b) => a.mimeType.localeCompare(b.mimeType));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sortedFileKey, sortBy]);

	const handleCheckboxChange = useCallback(
		(file: (typeof sortedFiles)[number], checked: boolean) => {
			if (checked) {
				//@ts-ignore
				setSelectedFiles((prev) => [...prev, file]);
			} else {
				//@ts-ignore
				setSelectedFiles((prev) => prev.filter((f) => f.id !== file.id));
			}
		},
		[setSelectedFiles]
	);

	useEffect(() => {
		(async () => {
			try {
				setIsConnecting(true);
				const telegramClient = await getTgClient({
					setBotRateLimit: tGCloudGlobalContext?.setBotRateLimit
				});
				if (!telegramClient) {
					setIsError(true);
					return;
				}

				setTelegramClient(telegramClient);
				const result = await withTelegramConnection(telegramClient as TelegramClient, () =>
					canWeAccessTheChannel(telegramClient as TelegramClient, user)
				);
				setCanWeAccessTGChannel(!!result);
			} catch (err) {
				console.error('err', err);
				setCanWeAccessTGChannel(false);
			} finally {
				setIsConnecting(false);
			}
		})();

		return () => {
			typeof client === 'object' && client?.disconnect();
		};
	}, []);

	if (tGCloudGlobalContext?.botRateLimit?.isRateLimited) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-center space-y-4">
					<h2 className="text-xl font-semibold">
						Slow Down! Telegram Needs a Breather 😭 (A.K.A Rate Limit)
					</h2>
					<p className="text-muted-foreground">
						Oops! We&apos;ve sent too many requests to Telegram, and they&apos;ve asked us to pause
						for a bit. Please come back in{' '}
						{Math.ceil(tGCloudGlobalContext.botRateLimit?.retryAfter / 60)} minutes, and we&apos;ll
						be good to go! If you don&apos;t want to wait, you can add a new bot token from the
						visible profile menu, and we&apos;ll use that instead.
					</p>
				</div>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-center space-y-4">
					<h2 className="text-xl font-semibold">Error Connecting to Telegram</h2>
					<p className="text-muted-foreground">
						Please try again later. If the problem persists, please contact support.
					</p>
				</div>
			</div>
		);
	}

	if (tGCloudGlobalContext?.isSwitchingFolder || isConnecting) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (canWeAccessTGChannel !== 'INITIAL' && canWeAccessTGChannel === false)
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-center space-y-4">
					<h2 className="text-xl font-semibold">Unable to Access Channel</h2>
					<p className="text-muted-foreground">
						We cannot access the Telegram channel. Have you deleted the channel?
					</p>
					<div className="flex gap-4 justify-center">
						<Button onClick={() => deleteChannelDetail()} variant="destructive">
							Yes, I deleted it
						</Button>
						<Button
							onClick={() => {
								window.location.reload();
							}}
							variant="outline"
						>
							No, I didn&apos;t
						</Button>
					</div>
				</div>
			</div>
		);

	if (!sortedFiles?.length)
		return (
			<div className="flex flex-col items-center justify-center h-full py-16">
				<div className="text-center space-y-4">
					<div className="flex justify-center mb-4">
						<Image src="/generic-document-placeholder.png" alt="No files" width={96} height={96} />
					</div>
					<h2 className="text-2xl font-bold">No files found</h2>
					<p className="text-muted-foreground">
						You haven&apos;t uploaded any files yet. Click the button below to get started.
					</p>
					<div>
						<Upload user={user} />
					</div>
				</div>
			</div>
		);

	async function batchDelete() {
		if (!Array.isArray(selectedFiles)) return;
		try {
			await Promise.all(
				selectedFiles.map(async (file) => {
					const { fileSmCacheKey, fileLgCacheKey } = getCacheKey(
						user?.channelId as string,
						file.fileTelegramId as string,
						file.category as MediaCategory
					);
					try {
						await removeCachedFile(fileSmCacheKey);
						await removeCachedFile(fileLgCacheKey);
					} catch (err) {
						console.error(err);
					}

					await deleteFile(file.id);
				})
			);
			toast.success('you have successfully deleted the files');
		} catch (err) {
			toast.error('Failed to Delete the files');
			console.error(err);
		} finally {
			router.refresh();
		}
	}

	return (
		<div className="w-full h-full">
			<div className="flex justify-end my-2">
				{!!(selectedFiles as Array<FileItem>)?.length && (
					<DeleteAllFiles deleteFn={async () => await batchDelete()}>
						<Button className="py-2 px-4 self-end" variant="destructive">
							<TrashIcon width={24} height={24} className="text-red-600" />
						</Button>
					</DeleteAllFiles>
				)}
			</div>
			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{sortedFiles?.map((file) => (
					<div className="relative w-full" key={file.id}>
						<EachFile
							client={stableClient as TelegramClient}
							file={file as FileItem}
							user={stableUser}
						/>
						<div className="absolute top-2 left-2 z-10">
							<Input
								onChange={(e) => handleCheckboxChange(file, e.target.checked)}
								id={`checkbox-${file.id}`}
								type="checkbox"
								className="peer w-5 h-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/50 transition-colors"
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function DeleteAllFiles({
	children,
	deleteFn
}: {
	children: React.ReactNode;
	deleteFn: () => Promise<void>;
}) {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
					<AlertDialogDescription>
						This action cannot be undone. This will permanently delete all files from your Telegram
						channel.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={async () => await deleteFn()}>Continue</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export default Files;

const addBotToChannel = async (client: TelegramClient, user: User) => {
	if (!user?.channelId || !user.accessHash) throw Error('Failed to create sharable url');
};

const filePlaceholderObj = {
	image: '/image-placeholder.png',
	document: '/generic-document-placeholder.png',
	pdf: '/pdf-placeholder.png',
	audio: '/audio-placeholder.svg',
	video: '/video-placeholder.png'
};

const getFilePlaceholder = (file: FileItem) => {
	if (file.category.startsWith('image')) return filePlaceholderObj.image;
	if (file.category == 'application/pdf') return filePlaceholderObj.pdf;
	if (file.category.startsWith('application')) return filePlaceholderObj.document;
	if (file.category.startsWith('audio')) return filePlaceholderObj.audio;
	if (file.category.startsWith('video')) return filePlaceholderObj.video;
};

const EachFile = React.memo(function EachFile({
	file,
	user,
	client
}: {
	file: FileItem;
	user: User;
	client: TelegramClient;
}) {
	const [url, setURL] = useState<string>(getFilePlaceholder(file) ?? '/placeholder.svg');
	const [thumbNailURL, setThumbnailURL] = useState<string>(
		getFilePlaceholder(file) ?? '/placeholder.svg'
	);
	const [isFileNotFoundInTelegram, setFileNotFoundInTelegram] = useState(false);

	const downlaodFile = async (size: 'large' | 'small', category: string) => {
		if (!client) {
			console.error('Telegram client not initialized');
			return;
		}
		try {
			const result = await withTelegramConnection(client, async (client) => {
				return await downloadMedia(
					{
						user: user as NonNullable<User>,
						messageId: file?.fileTelegramId,
						size,
						setURL,
						category: file.category as MediaCategory
					},
					client
				);
			});

			if (
				result &&
				typeof result === 'object' &&
				'fileExists' in result &&
				result.fileExists === false
			) {
				setFileNotFoundInTelegram(true);
			}
		} catch (error) {
			console.error('Error downloading file:', error);
			setFileNotFoundInTelegram(true);
		}
	};

	const router = useRouter();
	useEffect(() => {
		file.category == 'video'
			? (async () => {
					if (!client || typeof client === 'string') return;

					const media = (await getMessage({
						client,
						messageId: file.fileTelegramId,
						user: user as NonNullable<User>
					})) as Message['media'];

					const thumbnail = await generateVideoThumbnail(client, media as Message['media']);
					if (thumbnail) {
						setThumbnailURL(thumbnail);
						return;
					}

					console.log('no thumbnail', file.fileName);
				})()
			: (() => {
					downlaodFile('small', file.category);
					requestIdleCallback(async (e) => {
						await downlaodFile('large', file.category);
					});
				})();

		return () => {
			URL.revokeObjectURL(url as string);
		};

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [file.category]);

	const fileContextMenuActions = [
		{
			actionName: 'save',
			onClick: async () => {
				if (!url) return;
				const link = document.createElement('a');
				link.href = url!;
				link.download = file.fileName!;
				link.click();
			},
			Icon: CloudDownload,
			className: `flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-muted ${
				!url ? 'cursor-not-allowed opacity-50' : ''
			}`
		},
		{
			actionName: 'delete',
			onClick: async () => {
				const cacheKeySmall = `${user?.channelId}-${file.fileTelegramId}-${
					'small' satisfies MediaSize
				}-${file.category}`;
				const cacheKeyLarge = `${user?.channelId}-${file.fileTelegramId}-${
					'large' satisfies MediaSize
				}-${file.category}`;

				try {
					await fileCacheDb.fileCache.where('cacheKey').equals(cacheKeySmall).delete();
					await fileCacheDb.fileCache.where('cacheKey').equals(cacheKeyLarge).delete();
				} catch (err) {
					console.error(err);
				}

				const promies = () =>
					withTelegramConnection(client, async () => {
						await Promise.all([
							deleteFile(file.id),
							delelteItem(user, file.fileTelegramId, client)
						]);
					});

				promiseToast({
					cb: promies,
					errMsg: 'Failed to Delete the file',
					loadingMsg: 'please wait',
					successMsg: 'you have successfully deleted the file',
					position: 'top-center'
				}).then(() => router.refresh());
			},
			Icon: Trash2Icon,
			className:
				'flex items-center text-red-500 gap-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-red-600'
		},
		{
			actionName: 'share',
			onClick: async () => {
				try {
					await withTelegramConnection(client, async () => {
						await addBotToChannel(client, user);
					});
					const result = await shareFile({ fileID: file.fileTelegramId });
					const url = `${location.host}/share/${result?.[0].id}`;
					showSharableURL(url);
				} catch (err) {
					console.error(err);
				}
			},
			Icon: Share2 as typeof Trash2Icon,
			className:
				'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-muted '
		}
	];

	console.log('file category', file.category);

	return (
		<FileContextMenu fileContextMenuActions={fileContextMenuActions}>
			<Card
				id={url}
				className={`group relative overflow-hidden rounded-lg border border-border bg-background transition-all hover:bg-accent flex flex-col w-full min-w-0`}
			>
				<span className="sr-only">View file</span>
				<div className="w-full min-w-full flex-1 aspect-square relative bg-muted rounded-t-lg overflow-hidden">
					{file.category == 'image' ? (
						<FileModalView
							id={file.id}
							ItemThatWillShowOnModal={() => (
								<ImagePreviewModal fileData={{ ...file, category: 'image' }} url={url!} />
							)}
						>
							<ImageRender fileName={file.fileName} url={url!} />
						</FileModalView>
					) : null}
					{file.category == 'application' ? (
						<ImageRender fileName={file.fileName} url={url!} />
					) : null}
					{file.category == 'video' ? (
						<FileModalView
							id={file.id}
							ItemThatWillShowOnModal={() => (
								<VideoMediaView
									key={file.id}
									fileData={{ ...file, category: 'video' }}
									client={client}
									user={user}
								/>
							)}
						>
							<div className="w-full h-full min-w-full flex-1 relative">
								<ImageRender fileName={file.fileName} url={thumbNailURL} />
								<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
									<Play className="text-black bg-white p-2 rounded-full h-14 w-14" />
								</div>
							</div>
						</FileModalView>
					) : null}
					{file.category.startsWith('audio') ? (
						<FileModalView
							id={file.id}
							ItemThatWillShowOnModal={() => (
								<AudioMediaView
									key={file.id}
									fileData={{ ...file, category: 'audio' }}
									client={client}
									user={user!}
								/>
							)}
						>
							<ImageRender fileName={file.fileName} url={thumbNailURL} />
						</FileModalView>
					) : null}
				</div>
				<CardContent className="p-5 flex-1 flex flex-col justify-between">
					<div className="flex items-center justify-between">
						<div className="truncate font-medium">{file.fileName}</div>
						<Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
							{file.mimeType}
						</Badge>
					</div>
					<div className="mt-3 text-sm text-muted-foreground">
						<div className="flex justify-between items-center gap-3">
							<div>Size: {formatBytes(Number(file.size))}</div>
							<div>Date:{file.date}</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</FileContextMenu>
	);
});

function ImageRender({ url, fileName }: { url: string; fileName: string }) {
	return (
		<div className="w-full min-w-0 flex-1 aspect-square relative bg-muted rounded-t-lg overflow-hidden">
			<Image
				src={url ?? '/placeholder.svg'}
				alt={fileName}
				fill
				style={{
					objectFit: 'cover',
					objectPosition: 'center'
				}}
				className="w-full h-full object-cover object-center transition-transform duration-200 group-hover:scale-105"
			/>
		</div>
	);
}

function getVideoCodec(mimeType: string) {
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

const VideoMediaView = ({
	fileData,
	client,
	user
}: {
	fileData: Omit<FilesData[number], 'category'> & { category: 'video' };
	client: TelegramClient;
	user: User;
}) => {
	let self = useRef<HTMLVideoElement>(null);
	const [url, setURL] = useState<string>();
	const playerRef = useRef<FluidPlayerInstance>(undefined);

	useEffect(() => {
		(async () => {
			const message = await withTelegramConnection(client, async (client) => {
				const message = await getMessage({
					client,
					messageId: fileData.fileTelegramId,
					user: user as NonNullable<User>
				});

				if (!message) {
					throw new Error('Failed to get message');
				}
				return message;
			});

			await withTelegramConnection(client, async (client) => {
				await handleVideoDownload(client, message as Message['media'], setURL);
			});
		})();

		if (!playerRef.current) {
			playerRef.current = fluidPlayer(self.current!, {
				layoutControls: {
					allowDownload: true,
					miniPlayer: {
						autoToggle: true,
						enabled: true,
						position: 'bottom right',
						height: 200,
						width: 300,
						placeholderText: fileData.fileName
					}
				}
			});
		}
	}, []);

	return (
		<div className="flex flex-col h-full">
			<div className="flex-1 overflow-y-auto">
				<div className="relative aspect-video">
					<video
						ref={self}
						controls
						autoPlay
						className="w-full h-full object-contain"
						src={url}
					></video>
				</div>
				<div className="p-6 bg-background">
					<h3 className="text-2xl font-semibold">{fileData.fileName}</h3>
					<div className="flex items-center gap-2 text-muted-foreground">
						<VideoIcon className="w-5 h-5" />
						<span>{formatBytes(Number(fileData.size))}</span>
					</div>
					<div className="grid gap-2 mt-4">
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">File Name:</span>
							<span>{fileData.fileName}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">File Size:</span>
							<span>{formatBytes(Number(fileData.size))}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

function ImagePreviewModal({
	fileData,
	url
}: {
	fileData: Omit<FilesData[number], 'category'> & { category: 'image' };
	url: string;
}) {
	return (
		<div className="flex flex-col h-full">
			<div className="flex-1 overflow-y-auto">
				<div className="relative aspect-video">
					<Image
						property="1"
						src={url}
						alt={fileData.fileName}
						width={1920}
						height={1080}
						className="w-full h-full object-contain"
					/>
				</div>
				<div className="p-6 bg-background">
					<h3 className="text-2xl font-semibold">{fileData.fileName}</h3>
					<div className="flex items-center gap-2 text-muted-foreground">
						<ImageIcon className="w-5 h-5" />
						<span>{formatBytes(Number(fileData.size))}</span>
					</div>{' '}
					<div className="grid gap-2 mt-4">
						{' '}
						<div className="flex items-center justify-between">
							{' '}
							<span className="text-muted-foreground">File Name:</span>{' '}
							<span>{fileData.fileName}</span>{' '}
						</div>{' '}
						<div className="flex items-center justify-between">
							{' '}
							<span className="text-muted-foreground">File Size:</span>{' '}
							<span>{formatBytes(Number(fileData.size))}</span>{' '}
						</div>{' '}
					</div>{' '}
				</div>{' '}
			</div>{' '}
		</div>
	);
}

function AudioMediaView({
	fileData,
	client,
	user
}: {
	fileData: Omit<FilesData[number], 'category'> & { category: 'audio' };
	client: TelegramClient;
	user: NonNullable<User>;
}) {
	const [duration, setDuration] = useState<number | null>(null);
	const audioRef = useRef<HTMLAudioElement>(null);
	const [blobURL, setBlobURL] = useState<string>('');
	const tGCloudGlobalContext = getGlobalTGCloudContext();
	const { setMiniPlayerAudio, miniPlayerAudio } = tGCloudGlobalContext ?? {};

	useEffect(() => {
		(async () => {
			await withTelegramConnection(client, async (client) => {
				await downloadMedia(
					{
						category: 'audio',
						setURL: setBlobURL,
						user,
						messageId: fileData.fileTelegramId,
						size: 'large'
					},
					client
				);
				if (!blobURL) {
					throw new Error('Failed to download audio file');
				}
			});
		})();

		if (miniPlayerAudio) {
			setMiniPlayerAudio &&
				setMiniPlayerAudio({
					fileData: { ...fileData, folderId: '0', date: new Date().toISOString() },
					blobURL: miniPlayerAudio.blobURL,
					isPlaying: false,
					progress: miniPlayerAudio?.progress ?? 0,
					duration: miniPlayerAudio?.duration ?? 0,
					currentTime: miniPlayerAudio?.currentTime ?? 0,
					isMinimized: false,
					fileTelegramId: fileData.fileTelegramId
				});
			if (audioRef.current && miniPlayerAudio.fileTelegramId === fileData.fileTelegramId) {
				audioRef.current.onloadedmetadata = () => {
					audioRef.current!.currentTime = miniPlayerAudio.currentTime;
				};
			}
		}
		return () => {
			audioRef.current = null;
		};
	}, []);

	const handleLoadedMetadata = () => {
		if (audioRef.current) {
			setDuration(audioRef.current.duration);
		}
	};
	const handleMinimize = () => {
		const currentTime = audioRef.current?.currentTime ?? 0;
		const duration = audioRef.current?.duration ?? 0;
		const progress = currentTime / duration;
		const result = document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		setMiniPlayerAudio &&
			setMiniPlayerAudio({
				fileData: { ...fileData, folderId: '0', date: new Date().toISOString() },
				blobURL,
				isPlaying: true,
				currentTime,
				duration,
				progress,
				isMinimized: true,
				fileTelegramId: fileData.fileTelegramId
			});
	};

	if (Number(fileData.size) > 5 * 1024 * 1024) {
		return (
			<div className="flex flex-col h-full">
				<div className="flex-1 overflow-y-auto">
					<div className="relative aspect-square flex flex-col items-center justify-center gap-4 bg-muted rounded-t-lg p-6">
						<Image
							src="/audio-placeholder.svg"
							alt={fileData.fileName}
							width={192}
							height={192}
							className="object-contain w-32 h-32"
						/>
						<div className="text-center space-y-4">
							<h3 className="text-lg font-medium">Audio file too large to preview</h3>
							<p className="text-sm text-muted-foreground">
								We can&lsquo;t play files larger than 5mb. Please download the file to play it.
							</p>
						</div>
						<div className="flex flex-col gap-2 text-sm text-muted-foreground">
							<div className="flex items-center gap-2">
								<span>File Name:</span>
								<span>{fileData.fileName}</span>
							</div>
							<div className="flex items-center gap-2">
								<AudioIcon className="w-4 h-4" />
								<span>Size: {formatBytes(Number(fileData.size))}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			<div className="flex-1 overflow-y-auto">
				<div className="relative aspect-square flex items-center justify-center bg-muted rounded-t-lg">
					<Image
						src="/audio-placeholder.svg"
						alt={fileData.fileName}
						width={192}
						height={192}
						className="object-contain w-32 h-32"
					/>
					<button
						onClick={handleMinimize}
						className="absolute top-2 right-2 bg-background border border-border rounded-full p-2 hover:bg-muted transition-colors z-10"
						title="Minimize to mini-player"
						aria-label="Minimize to mini-player"
					>
						<Minimize2 className="w-5 h-5" />
					</button>
				</div>
				<div className="p-6 bg-background flex flex-col gap-4">
					<h3 className="text-2xl break-all max-w-md font-semibold flex items-center gap-2">
						<AudioIcon className="w-6 h-6" />
						{fileData.fileName}
					</h3>
					<audio
						ref={audioRef}
						controls
						src={blobURL || undefined}
						className="w-full mt-2"
						autoPlay
						onLoadedMetadata={handleLoadedMetadata}
					/>
					<div className="flex flex-col gap-2 mt-4 text-muted-foreground text-sm">
						<div className="flex items-center gap-2">
							<span>Size:</span>
							<span>{formatBytes(Number(fileData.size))}</span>
						</div>
						<div className="flex items-center gap-2">
							<span>Duration:</span>
							<span>
								{duration
									? `${Math.floor(duration / 60)}:${('0' + Math.floor(duration % 60)).slice(-2)} min`
									: '—'}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
