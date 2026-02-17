'use client';
import { deleteChannelDetail, deleteFile, saveTelegramCredentials, shareFile } from '@/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { fileCacheDb } from '@/lib/dexie';
import { getTgClient } from '@/lib/getTgClient';
import { errorToast, promiseToast } from '@/lib/notify';
import { getCode, getPassword, getPhoneNumber } from '@/lib/telegramAuthHelpers';
import { withTelegramConnection } from '@/lib/telegramMutex';
import Message, { FileItem, FilesData, GetAllFilesReturnType, User } from '@/lib/types';
import {
	canWeAccessTheChannel,
	deleteItem,
	downloadMedia,
	formatBytes,
	generateVideoThumbnail,
	getCacheKey,
	getMessage,
	MediaCategory,
	MediaSize,
	removeCachedFile
} from '@/lib/utils';
import fluidPlayer from 'fluid-player';
import { Minimize2, Play, Share2, TrashIcon } from 'lucide-react';
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

import { useGlobalStore } from '@/store/global-store';
import React from 'react';
import Swal from 'sweetalert2';
import { TelegramClient } from 'telegram';
import { streamMedia } from '@/lib/video-stream';

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
	const [canWeAccessTGChannel, setCanWeAccessTGChannel] = useState<boolean>(true);
	const [client, setTelegramClient] = useState<TelegramClient | null>(null);

	const [isError, setIsError] = useState(false);

	const [isConnecting, setIsConnecting] = useState(false);
	const [isUserLoading, setIsUserLoading] = useState(false);

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

	const setBotRateLimit = useGlobalStore((state) => state.setBotRateLimit);
	const botRateLimit = useGlobalStore((state) => state.botRateLimit);
	const isSwitchingFolder = useGlobalStore((state) => state.isSwitchingFolder);
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

				const telegramClient = await getTgClient(getTgClientArgs);
				if (!telegramClient) {
					setIsError(true);
					return;
				}

				setTelegramClient(telegramClient);
				const result = await withTelegramConnection(telegramClient as TelegramClient, (client) =>
					canWeAccessTheChannel(client, user)
				);
				setCanWeAccessTGChannel(!!result);
			} catch (err) {
				console.error('error in files main connection useEffect:', err);
				setCanWeAccessTGChannel(false);
			} finally {
				setIsConnecting(false);
			}
		})().catch(err => {
			console.error('Unhandled rejection in Files main connection useEffect:', err);
		});

		return () => {
			client?.connected && client.disconnect();
		};
	}, []);

	const getClient = useCallback(async () => {
		return await getTgClient({
			stringSession: '',
			authType: 'user'
		});
	}, []);

	async function loginInTelegram() {
		try {
			const clientInstance = await getClient();
			if (!clientInstance) return;

			let errCount = 0
			await clientInstance?.start({
				phoneNumber: async () => await getPhoneNumber(),
				password: async () => await getPassword(),
				phoneCode: async () => await getCode(),
				onError: (err) => {
					console.error('Telegram login error:', err)
					errorToast(err?.message)
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
				errorToast(message);
			}
			return undefined;
		}
	}

	async function connectTelegramUser() {
		try {
			setIsUserLoading(true);

			const newSession = await loginInTelegram();
			if (!newSession) {
				setIsUserLoading(false);
				return;
			}

			const clientInstance = await getClient();
			if (!clientInstance) {
				toast.error('Failed to initialize Telegram client');
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

	if (isSwitchingFolder || isConnecting || !client) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!canWeAccessTGChannel)
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
			const fileTelegramIds = selectedFiles.map((file) => file.fileTelegramId).filter((id) => id !== null)
			if (!stableClient) throw Error("there was an error while deleting the files")
			const result = await deleteItem(user, fileTelegramIds, stableClient)
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
							client={stableClient as TelegramClient}
							file={file as FileItem}
							user={stableUser}
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
		console.log('about to start downloading')
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
				try {
					if (!client || typeof client === 'string') return;

					const media = (await getMessage({
						client,
						messageId: file.fileTelegramId,
						user: user as NonNullable<User>
					})) as Message['media'] | null | undefined

					if (!media) {
						setFileNotFoundInTelegram(true);
						return;
					}

					const thumbnail = await generateVideoThumbnail(client, media);
					if (thumbnail) {
						setThumbnailURL(thumbnail);
						return;
					}

					console.log('no thumbnail', file.fileName);
				} catch (err) {
					console.error('Error fetching video metadata:', err);
					setFileNotFoundInTelegram(true);
				}
			})().catch(err => {
				console.error('Unhandled rejection in EachFile video effect:', err);
			})
			: (() => {
				downlaodFile('small', file.category).catch(err => {
					console.error('Error in downloadFile (small):', err);
				});
				requestIdleCallback(async (e) => {
					try {
						await downlaodFile('large', file.category);
					} catch (err) {
						console.error('Error in downloadFile (large):', err);
					}
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

	console.log('file category', file.category);

	return (
		<FileContextMenu fileContextMenuActions={fileContextMenuActions}>
			<Card
				id={url}
				className={`group relative overflow-hidden rounded-lg border border-border bg-background transition-all hover:bg-accent flex flex-col w-full min-w-0`}
			>
				{isFileNotFoundInTelegram && (
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
							key={file.id + 'audio'}
							id={file.id}
							ItemThatWillShowOnModal={() => (
								<AudioMediaView
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

const VideoMediaView = React.memo(({
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
				await streamMedia({
					client,
					media: message as Message['media'],
					mimeType: fileData.mimeType,
					setURL
				}
				);
			});
		})().catch((err) => {
			console.error('Unhandled rejection in AudioMediaView effect:', err);
		})

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
	user
}: {
	fileData: Omit<FilesData[number], 'category'> & { category: 'audio' };
	client: TelegramClient;
	user: NonNullable<User>;
}) {
	const [duration, setDuration] = useState<number | null>(null);
	const audioRef = useRef<HTMLAudioElement>(null);
	const [blobURL, setBlobURL] = useState<string | undefined>(undefined);
	const setMiniPlayerAudio = useGlobalStore((state) => state.setMiniPlayerAudio);
	const miniPlayerAudio = useGlobalStore((state) => state.miniPlayerAudio);

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
				await streamMedia({
					client,
					media: message as Message['media'],
					mimeType: fileData.mimeType,
					setURL: setBlobURL
				}
				);
			});
		})().catch((err) => {
			console.error('Unhandled rejection in AudioMediaView effect:', err);
		})

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
				blobURL: blobURL ?? " ",
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
