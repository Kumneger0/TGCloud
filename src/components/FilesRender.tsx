'use client';
import { deleteFile, saveTelegramCredentials } from '@/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { fileCacheDb } from '@/lib/dexie';
import { getTgClient } from '@/lib/getTgClient';
import { promiseToast } from '@/lib/notify';
import { withTelegramConnection } from '@/lib/telegramMutex';
import Message, { FileItem, FilesData, GetAllFilesReturnType, User } from '@/lib/types';
import {
	deleteItem,
	downloadMedia,
	formatBytes,
	generateVideoThumbnail,
	getCacheKey,
	getFilePlaceholder,
	getMessage,
	loginInTelegram,
	MediaCategory,
	MediaSize,
	QUERY_KEYS,
	removeCachedFile
} from '@/lib/utils';
import fluidPlayer from 'fluid-player';
import { Minimize2, Play, TrashIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
	Music2Icon as AudioIcon,
	CloudDownload,
	ImageIcon,
	Trash2Icon,
	VideoIcon
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

import { streamMedia } from '@/lib/video-stream';
import { useGlobalStore } from '@/store/global-store';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { TelegramClient } from 'telegram';

function Files({
	user,
	files
}: {
	user: User & {
		telegramSession: string | undefined;
		plan: NonNullable<User>['plan'];
		botTokens: { token: string }[];
	};
	mimeType?: string;
	files: NonNullable<GetAllFilesReturnType>['files'] | undefined;
	folders: NonNullable<GetAllFilesReturnType>['folders'] | undefined;
	currentFolderId: string | null;
}) {
	const sortBy = useGlobalStore((state) => state.sortBy);
	const setBotRateLimit = useGlobalStore((state) => state.setBotRateLimit);
	const botRateLimit = useGlobalStore((state) => state.botRateLimit);
	const isSwitchingFolder = useGlobalStore((state) => state.isSwitchingFolder);
	const { data: client, isPending, error } = useQuery({
		queryKey: ["client"],
		queryFn: async () => {
			console.log('client')
			const getTgClientArgs: Parameters<typeof getTgClient>[0] | null =
				user.authType === 'user' && user.telegramSession
					? {
						authType: 'user',
						stringSession: user.telegramSession ?? ''
					}
					: {
						authType: 'bot',
						botToken: undefined,
						setBotRateLimit
					};

			try {
				const telegramClient = await getTgClient(getTgClientArgs);

				if (telegramClient) {
					if (!telegramClient?.connected) await telegramClient.connect()
					const whoAmI = await telegramClient.getMe()
					console.log(whoAmI)
					return telegramClient
				}

				if (!telegramClient) {
					throw new Error("Failed to connnect to telegram")
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : "Failed to connnect to telegram"
				throw new Error(message)
			}

		}

	})

	const [isUserLoading, setIsUserLoading] = useState(false);
	const router = useRouter();
	const [selectedFiles, setSelectedFiles] = useState<typeof files>([]);
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

	const getClient = useCallback(async () => {
		return await getTgClient({
			stringSession: '',
			authType: 'user'
		});
	}, []);


	async function connectTelegramUser() {
		try {
			setIsUserLoading(true);

			const clientInstance = await getClient();
			if (!clientInstance) {
				toast.error('Failed to initialize Telegram client');
				return;
			}

			const newSession = await loginInTelegram(clientInstance);
			if (!newSession) {
				setIsUserLoading(false);
				return;
			}

			if (!clientInstance?.connected) {
				await clientInstance?.connect();
			}

			if (!newSession) {
				toast.error('There was an error while connecting to telegram');
				return;
			}

			if (user.channelId && user.accessHash) {
				await saveTelegramCredentials({
					session: newSession,
					accessHash: user.accessHash,
					channelId: user.channelId,
					channelTitle: user.channelTitle ?? user.name + "Drive",
					authType: 'user'
				});
				posthog.capture('userTelegramAccountConnect', { userId: user.id });
				window.location.reload();
				return;
			}
		} catch (err) {
			console.error(err);
			if (err instanceof Error) {
				toast.error(err.message);
			}
		} finally {
			setIsUserLoading(false);
		}
	}


	if (isSwitchingFolder || isPending) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	const errMessage = error?.message
	if (errMessage || !client) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-center space-y-4">
					<h2 className="text-xl font-semibold">Error Connecting to Telegram</h2>
					<p className="text-muted-foreground">
						{errMessage ?? "We are having some technical difficulties connecting to telegram. Please try again later."}
					</p>
				</div>
			</div>
		);
	}

	if (botRateLimit.isRateLimited && user.authType === 'bot') {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-center space-y-4 max-w-2xl px-4">
					<h2 className="text-xl font-semibold">
						Slow Down! Telegram Needs a Breather 😭 (A.K.A Rate Limit)
					</h2>
					<p className="text-muted-foreground">
						Oops! We&apos;ve sent too many requests to Telegram, and they&apos;ve asked us to pause
						for a bit. Please come back in {Math.ceil(botRateLimit?.retryAfter / 60)} minutes, and
						we&apos;ll be good to go!
					</p>

					<div className="p-4 bg-muted/50 rounded-lg border border-border text-left space-y-4 mt-6">
						<div className="flex items-start gap-3">
							<div className="p-2 bg-primary/10 rounded-full text-primary shrink-0">
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>
							</div>
							<div className="space-y-1">
								<h3 className="font-medium">Want to bypass this limit?</h3>
								<p className="text-sm text-muted-foreground">
									Connect your <strong>User Account</strong> instead of using a bot. User accounts have much higher limits!
								</p>
							</div>
						</div>

						<div className="space-y-3 pt-2">
							<div className="text-sm text-amber-600 dark:text-amber-400 p-3 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-900/50 flex gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M3.32 6.64l6.09 10.59a2 2 0 0 0 3.18 0l6.09-10.59-1.32-2.31H4.64l-1.32 2.31Z" /></svg>
								<div>
									<p className="font-semibold">Safety First!</p>
									<p className="opacity-90">Please use a <strong>separate Telegram account</strong> for this purpose.</p>
								</div>
							</div>

							<div className="text-sm text-blue-600 dark:text-blue-400 p-3 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-900/50 flex gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
								<div>
									<p className="font-semibold">Requirement</p>
									<p className="opacity-90">The account you connect must be an <strong>admin</strong> of your current channel.</p>
								</div>
							</div>
						</div>

						<Button
							onClick={connectTelegramUser}
							disabled={isUserLoading}
							className="w-full"
						>
							{isUserLoading ? 'Connecting...' : 'Switch to User Account'}
						</Button>
					</div>
				</div>
			</div>
		);
	}


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
			const fileTelegramIds = selectedFiles.map((file) => file.fileTelegramId).filter((id) => id !== null)
			if (!client) throw Error("there was an error while deleting the files")
			const result = await deleteItem(user, fileTelegramIds, client)
			if (!result) throw Error("there was an error while deleting the files")
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
			const message = err instanceof Error ? err.message : 'Failed to Delete the files'
			toast.error(message);
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
							<TrashIcon width={24} height={24} />
						</Button>
					</DeleteAllFiles>
				)}
			</div>
			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{sortedFiles?.map((file) => (
					<div className="relative w-full" key={file.id}>
						<EachFile
							client={client}
							file={file as FileItem}
							user={user}
						/>
						<div className="absolute top-2 left-2 z-40">
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

const EachFile = React.memo(function EachFile({
	file,
	user,
	client
}: {
	file: FileItem;
	user: User;
	client: TelegramClient;
}) {
	const [largeURL, setLargeURL] = useState<string | null>(null)
	const { data, isPending, error } = useQuery({
		queryKey: ["file", file.id],
		queryFn: async () => {
			if (file.category !== "video") {
				return await withTelegramConnection(client, async (client) => {
					const result = await downloadMedia(
						{
							user,
							messageId: file?.fileTelegramId,
							size: "small",
							category: file.category as MediaCategory,
						},
						client
					);
					return { ...result, notFound: result?.notFound ?? false }
				});
			}
		}
	})

	const { data: videoData, isPending: videoIsPending, error: videoError } = useQuery({
		queryKey: ["video", file.id],
		queryFn: async (): Promise<{ thumbnail?: string, notFound: boolean } | null> => {
			if (file.category == "video") {
				const media = (await getMessage({
					client,
					messageId: file.fileTelegramId,
					user: user as NonNullable<User>
				})) as Message['media'] | null | undefined

				if (!media) {
					return { notFound: true }
				}

				const thumbnail = await generateVideoThumbnail(client, media);
				return { thumbnail, notFound: false };
			}
			return null
		}
	})

	useEffect(() => {
		const idleId = requestIdleCallback(async () => {
			const largeURL = await withTelegramConnection(client, async (client) => {
				const result = await downloadMedia(
					{
						user,
						messageId: file?.fileTelegramId,
						size: "large",
						category: file.category as MediaCategory,
					},
					client
				);
				return { ...result, notFound: result?.notFound ?? false }
			});
			setLargeURL(largeURL?.url ?? null)
		})
		return () => cancelIdleCallback(idleId)
	}, [])




	const url = largeURL ?? data?.url
	const notFound = data?.notFound || videoData?.notFound
	const router = useRouter()

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
			className: `flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-muted ${!url ? 'cursor-not-allowed opacity-50' : ''
				}`
		},
		{
			actionName: 'delete',
			onClick: async () => {
				const cacheKeySmall = `${user?.channelId}-${file.fileTelegramId}-${'small' satisfies MediaSize
					}-${file.category}`;
				const cacheKeyLarge = `${user?.channelId}-${file.fileTelegramId}-${'large' satisfies MediaSize
					}-${file.category}`;

				try {
					await fileCacheDb.fileCache.where('cacheKey').equals(cacheKeySmall).delete();
					await fileCacheDb.fileCache.where('cacheKey').equals(cacheKeyLarge).delete();
				} catch (err) {
					console.error(err);
				}

				const promies = () =>
					withTelegramConnection(client, async (client) => {
						await Promise.all([
							deleteFile(file.id),
							deleteItem(user, file.fileTelegramId, client)
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
		}
	];

	return (
		<FileContextMenu fileContextMenuActions={fileContextMenuActions}>
			<Card
				id={url}
				className={`group relative overflow-hidden rounded-lg border border-border bg-background transition-all hover:bg-accent flex flex-col w-full min-w-0`}
			>
				{notFound && (
					<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-4 text-center space-y-3">
						<p className="text-sm font-medium text-destructive">
							File not found in Telegram
						</p>
						<a
							href={`https://t.me/c/${(user.channelId ?? '').replace('-100', '')}/${file.fileTelegramId}`}
							target="_blank"
							rel="noopener noreferrer"
							className="text-xs text-primary hover:underline"
						>
							Search in Telegram
						</a>
						<p className="text-[10px] text-muted-foreground">
							If you can find the file using the link above, please{' '}
							<a href="mailto:tgcloud-support@kumneger.dev" className="underline">
								contact us
							</a>
						</p>
					</div>
				)}
				<span className="sr-only">View file</span>
				<div className="w-full min-w-full flex-1 aspect-square relative bg-muted rounded-t-lg overflow-hidden">
					{file.category == 'image' ? (
						<FileModalView
							key={file.id}
							id={file.id}
							queryKey={QUERY_KEYS.image(file.id)}
							modalContent={
								<ImagePreviewModal fileData={{ ...file, category: 'image' }} url={url!} />
							}
						>
							<ImageRender fileName={file.fileName} url={url!} />
						</FileModalView>
					) : null}
					{file.category == 'application' ? (
						<ImageRender fileName={file.fileName} url={url!} />
					) : null}
					{file.category == 'video' ? (
						<FileModalView
							key={file.id}
							queryKey={QUERY_KEYS.video(file.id)}
							id={file.id}
							modalContent={
								<VideoMediaView
									queryKey={QUERY_KEYS.video(file.id)}
									fileData={{ ...file, category: 'video' }}
									client={client}
									user={user}
								/>
							}
						>
							<div className="w-full h-full min-w-full flex-1 relative">
								<ImageRender fileName={file.fileName} url={getFilePlaceholder(file) ?? ""} />
								<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
									<Play className="text-black bg-white p-2 rounded-full h-14 w-14" />
								</div>
							</div>
						</FileModalView>
					) : null}
					{file.category.startsWith('audio') ? (
						<FileModalView
							key={file.id}
							id={file.id}
							queryKey={QUERY_KEYS.audio(file.id)}
							modalContent={
								<AudioMediaView
									queryKey={QUERY_KEYS.audio(file.id)}
									fileData={{ ...file, category: 'audio' }}
									client={client}
									user={user!}
								/>
							}
						>
							<ImageRender fileName={file.fileName} url={getFilePlaceholder(file) ?? ""} />
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

const VideoMediaView = React.memo(({
	fileData,
	client,
	user,
	queryKey
}: {
	fileData: Omit<FilesData[number], 'category'> & { category: 'video' };
	client: TelegramClient;
		queryKey: string;
	user: User;
}) => {
	let self = useRef<HTMLVideoElement>(null);
	const playerRef = useRef<FluidPlayerInstance>(undefined);

	const { data: url } = useQuery({
		queryKey: [queryKey],
		queryFn: async () => {
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

			const mediaSource = new MediaSource();
			const url = URL.createObjectURL(mediaSource);

			withTelegramConnection(client, async (client) => {
				await streamMedia({
					client,
					media: message as Message['media'],
					mimeType: fileData.mimeType,
					mediaSource
				})
			});
			return url;
		}
	})

	useEffect(() => {
		if (!playerRef.current) {
			playerRef.current = fluidPlayer(self.current!, {
				layoutControls: {
					allowDownload: false,
					autoPlay: true,
					logo: {
						imageUrl: '/TGCloud_PWA_icon_96x96.png',
						position: 'top left',
						imageMargin: '10px',
					},
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
	}, [fileData.id]);

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
})

VideoMediaView.displayName = 'VideoMediaView';

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
	user,
	queryKey
}: {
	fileData: Omit<FilesData[number], 'category'> & { category: 'audio' };
	client: TelegramClient;
		queryKey: string;
	user: NonNullable<User>;
}) {
	const [duration, setDuration] = useState<number | null>(null);
	const audioRef = useRef<HTMLAudioElement>(null);
	const setMiniPlayerAudio = useGlobalStore((state) => state.setMiniPlayerAudio);
	const miniPlayerAudio = useGlobalStore((state) => state.miniPlayerAudio);

	const { data: blobURL } = useQuery({
		queryKey: [queryKey],
		queryFn: async () => {
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

			const mediaSource = new MediaSource();
			const url = URL.createObjectURL(mediaSource);

			withTelegramConnection(client, async (client) => {
				await streamMedia({
					client,
					media: message as Message['media'],
					mimeType: fileData.mimeType,
					mediaSource
				})
			});
			return url;
		}
	})

	useEffect(() => {
		setTimeout(() => {
			if (audioRef.current) {
				setDuration(audioRef.current?.duration)
			}
		}, 10000)
		if (miniPlayerAudio && blobURL) {
			setMiniPlayerAudio &&
				setMiniPlayerAudio({
					fileData: { ...fileData, folderId: '0', date: new Date().toISOString() },
					blobURL: blobURL,
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

	const handleMinimize = () => {
		const currentTime = audioRef.current?.currentTime ?? 0;
		const duration = audioRef.current?.duration ?? 0;
		const progress = currentTime / duration;
		const result = document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		setMiniPlayerAudio && blobURL &&
			setMiniPlayerAudio({
				fileData: { ...fileData, folderId: '0', date: new Date().toISOString() },
				blobURL: blobURL,
				isPlaying: true,
				currentTime,
				duration,
				progress,
				isMinimized: true,
				fileTelegramId: fileData.fileTelegramId
			});
	};

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
