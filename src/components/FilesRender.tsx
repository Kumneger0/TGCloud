'use client';
import { deleteFile, saveTelegramCredentials } from '@/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { fileCacheDb } from '@/lib/dexie';
import { getTgClient } from '@/lib/getTgClient';
import { withTelegramConnection } from '@/lib/telegramMutex';
import Message, { FileItem, FilesData, GetAllFilesReturnType, User } from '@/lib/types';
import {
	canWeAccessTheChannel,
	deleteItem,
	downloadMedia,
	downloadVideoThumbnail,
	formatBytes,
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
import { Loader2, Minimize2, Pause, Play, TrashIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FileContextMenu from './fileContextMenu';
import { FileModalView } from './fileModalView';
import {
	Music2Icon as AudioIcon,
	CloudDownload,
	ImageIcon,
	Trash2Icon,
	VideoIcon
} from './Icons/icons';
import Upload from './uploadWrapper';

import { streamMedia } from '@/lib/video-stream';
import { useGlobalModal } from '@/store/global-modal';
import { useGlobalStore } from '@/store/global-store';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { TelegramClient } from 'telegram';
import { ChannelAccessDeniedModalContent } from './fileConnectionErrorModals';
import { SyncFromTelegramModal } from './SyncFromTelegramModal';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { toast } from 'sonner';

function Files({
	files,
	currentFolderId
}: {
	mimeType?: string;
		files: NonNullable<GetAllFilesReturnType>['files'] | undefined;
	currentFolderId: string | null;
}) {
	const user = useGlobalStore((state) => state.user);
	const sortBy = useGlobalStore((state) => state.sortBy);
	const setBotRateLimit = useGlobalStore((state) => state.setBotRateLimit);
	const botRateLimit = useGlobalStore((state) => state.botRateLimit);
	const isSwitchingFolder = useGlobalStore((state) => state.isSwitchingFolder);
	const setClient = useGlobalStore((s) => s.setClient);
	const { handleError } = useErrorHandler();

	const [error, setError] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);
	const client = useGlobalStore((s) => s.client);
	const { closeModal, openModal } = useGlobalModal();
	const router = useRouter();
	const setUserTgInfo = useGlobalStore((s) => s.setUserTgInfo);

	const openSyncModal = () => {
		openModal({
			title: 'Sync from Telegram',
			size: 'lg',
			content: (
				<SyncFromTelegramModal
					currentFolderId={currentFolderId}
					onSuccess={() => {
						closeModal();
						router.refresh();
					}}
					onClose={closeModal}
				/>
			)
		});
	};

	useEffect(() => {
		const getClient = async () => {
			if (!user) return;
			setIsPending(true);
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
				console.log('client', telegramClient)

				if (telegramClient) {
					if (!telegramClient?.connected) await telegramClient.connect();
					const whoAmI = await telegramClient.getMe();
					setUserTgInfo(whoAmI);

					const canWeAccess = await withTelegramConnection(telegramClient, (client) =>
						canWeAccessTheChannel(client, user)
					);

					if (!canWeAccess) {
						openModal({
							forceDialog: true,
							content: (
								<ChannelAccessDeniedModalContent
									authType={user.authType}
									closeModal={closeModal}
									onReconnect={() => router.push('/connect-telegram')}
								/>
							)
						});
						setError("We couldn't access your Telegram channel.");
						return;
					}
					setClient(telegramClient);
				}

				if (!telegramClient) {
					setError('Failed to connnect to telegram');
				}
			} catch (err) {
				const message = handleError(err, {
					onReconnect: async () => {
						setIsUserLoading(true);
						await connectTelegramUser();
					}
				})
				setError(message ?? "Failed to connnect to telegram");
			} finally {
				setIsPending(false);
			}
		};

		getClient();
	}, [user?.telegramSession, user?.authType, client?.connected]);

	const [isUserLoading, setIsUserLoading] = useState(false);
	const [selectedFiles, setSelectedFiles] = useState<typeof files>([]);
	const sortedFiles = useMemo(() => {
		if (!files || !Array.isArray(files) || files.length === 0) return [];
		if (sortBy === 'name') return [...files].sort((a, b) => a.fileName.localeCompare(b.fileName));
		if (sortBy === 'date')
			return [...files].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
		if (sortBy === 'size') return [...files].sort((a, b) => Number(a.size) - Number(b.size));
		return [...files].sort((a, b) => a.mimeType.localeCompare(b.mimeType));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [files, sortBy]);

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
			if (!user) return;
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
				const result = await saveTelegramCredentials({
					session: newSession,
					accessHash: user.accessHash,
					channelId: user.channelId,
					channelTitle: user.channelTitle ?? user.name + 'Drive',
					authType: 'user'
				});
				if (!result.success) {
					toast.error(result.message);
					return;
				}
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

	if (!user || isSwitchingFolder || ((user?.authType == "bot" && !botRateLimit.isRateLimited && isPending) || (user?.authType == "user" && isPending))) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (error && ((user?.authType == "bot" && !botRateLimit.isRateLimited && !client) || (user?.authType == "user" && !client))) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-center space-y-4">
					<h2 className="text-xl font-semibold">Error Connecting to Telegram</h2>
					<p className="text-muted-foreground">{error}</p>
				</div>
			</div>
		);
	}

	if (botRateLimit.isRateLimited && user?.authType === 'bot') {
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
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
									<circle cx="8.5" cy="7" r="4" />
									<polyline points="17 11 19 13 23 9" />
								</svg>
							</div>
							<div className="space-y-1">
								<h3 className="font-medium">Want to bypass this limit?</h3>
								<p className="text-sm text-muted-foreground">
									Connect your <strong>User Account</strong> instead of using a bot. User accounts
									have much higher limits!
								</p>
							</div>
						</div>

						<div className="space-y-3 pt-2">
							<div className="text-sm text-amber-600 dark:text-amber-400 p-3 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-900/50 flex gap-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="shrink-0 mt-0.5"
								>
									<path d="M12 9v4" />
									<path d="M12 17h.01" />
									<path d="M3.32 6.64l6.09 10.59a2 2 0 0 0 3.18 0l6.09-10.59-1.32-2.31H4.64l-1.32 2.31Z" />
								</svg>
								<div>
									<p className="font-semibold">Safety First!</p>
									<p className="opacity-90">
										Please use a <strong>separate Telegram account</strong> for this purpose.
									</p>
								</div>
							</div>

							<div className="text-sm text-blue-600 dark:text-blue-400 p-3 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-900/50 flex gap-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="shrink-0 mt-0.5"
								>
									<circle cx="12" cy="12" r="10" />
									<path d="M12 16v-4" />
									<path d="M12 8h.01" />
								</svg>
								<div>
									<p className="font-semibold">Requirement</p>
									<p className="opacity-90">
										The account you connect must be an <strong>admin</strong> of your current
										channel.
									</p>
								</div>
							</div>
						</div>

						<Button onClick={connectTelegramUser} disabled={isUserLoading} className="w-full">
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
		if (!Array.isArray(selectedFiles) || !user) return;
		try {
			const fileTelegramIds = selectedFiles
				.map((file) => file.fileTelegramId)
				.filter((id) => id !== null);
			if (!client) throw Error('there was an error while deleting the files');
			const result = await deleteItem(user, fileTelegramIds, client);
			if (!result) throw Error('there was an error while deleting the files');
			await Promise.all(
				selectedFiles.map(async (file) => {
					const cacheKeys = getCacheKey(
						user?.channelId as string,
						file.fileTelegramId as string,
						file.category as MediaCategory
					);
					if (cacheKeys) {
						try {
							await removeCachedFile(cacheKeys.fileSmCacheKey);
							await removeCachedFile(cacheKeys.fileLgCacheKey);
						} catch (err) {
							console.error(err);
						}
					}

					await deleteFile(file.id);
				})
			);
			toast.success('you have successfully deleted the files');
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to Delete the files';
			toast.error(message);
			console.error(err);
		} finally {
			router.refresh();
		}
	}

	return (
		<div className="w-full h-full">
			<div className="flex justify-end my-2 gap-2">
				<Button variant="outline" onClick={openSyncModal}>
					Sync from Telegram
				</Button>
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
						<EachFile file={file as FileItem} user={user} />
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

function DeleteModalContent({
	closeModal,
	deleteFn
}: {
		closeModal: () => void;
	deleteFn: () => Promise<void>;
}) {
	const [isDeleting, setIsDeleting] = useState(false);

	return (
		<div className="space-y-6">
			<p className="text-sm text-muted-foreground">
				This action cannot be undone. This will permanently delete all selected files from your
				Telegram channel.
			</p>
			<div className="flex justify-end gap-3">
				<Button variant="outline" disabled={isDeleting} onClick={() => closeModal()}>
					Cancel
				</Button>
				<Button
					variant="destructive"
					disabled={isDeleting}
					onClick={async () => {
						setIsDeleting(true);
						try {
							await deleteFn();
						} finally {
							setIsDeleting(false);
							closeModal();
						}
					}}
				>
					{isDeleting ? 'Deleting...' : 'Continue'}
				</Button>
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
	const { openModal, closeModal } = useGlobalModal();

	const handleClick = () => {
		openModal({
			title: 'Are you absolutely sure?',
			forceDialog: true,
			content: <DeleteModalContent closeModal={closeModal} deleteFn={deleteFn} />
		});
	};

	return <div onClick={handleClick}>{children}</div>;
}

export default Files;

const EachFile = React.memo(function EachFile({ file, user }: { file: FileItem; user: User }) {
	const client = useGlobalStore((s) => s.client);
	if (!user) return null;
	const [largeURL, setLargeURL] = useState<string | null>(null);
	const { openModal, closeModal } = useGlobalModal();
	const { data, isPending, error } = useQuery<{ notFound?: boolean; url?: string }>({
		queryKey: ['file', file.id],
		queryFn: async () => {
			if (!client) return { notFound: false, url: undefined };
			if (file.category === 'image') {
				return await withTelegramConnection(client, async (client) => {
					const result = await downloadMedia(
						{
							user,
							messageId: file?.fileTelegramId,
							size: 'small',
							category: file.category as MediaCategory,
							mimeType: file.mimeType,
						},
						client
					);
					return { url: result?.url, notFound: result?.notFound ?? false };
				});
			}
			return { notFound: false, url: undefined };
		}
	});

	const {
		data: videoData,
		isPending: videoIsPending,
		error: videoError
	} = useQuery<{ thumbnail?: string; notFound?: boolean }>({
		queryKey: ['video', file.id],
		queryFn: async () => {
			try {
				if (!client) return { notFound: false, thumbnail: undefined };
				if (file.category == 'video') {
					const media = (await getMessage({
						client,
						messageId: file.fileTelegramId,
						user: user as NonNullable<User>
					})) as Message['media'] | null | undefined;

					if (!media) {
						return { notFound: true };
					}

					const thumbnail = await downloadVideoThumbnail(client, media);
					return { thumbnail: thumbnail?.url, notFound: false };
				}
				return { thumbnail: undefined };
			} catch (err) {
				handleError(err, { onReconnect: () => window.location.reload() })
				return { thumbnail: undefined };
			}
		}
	});

	useEffect(() => {
		const runIdle = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 0));
		const cancelIdle = window.cancelIdleCallback ?? ((id) => clearTimeout(id));

		const idleId = runIdle(async () => {
			try {
				if (!client) return;
				if (file.category == 'image') {
					const largeURL = await withTelegramConnection(client, async (client) => {
						const result = await downloadMedia(
							{
								user,
								messageId: file?.fileTelegramId,
								size: 'large',
								category: file.category as MediaCategory,
								mimeType: file.mimeType
							},
							client
						);
						return { ...result, notFound: result?.notFound ?? false };
					});
					setLargeURL(largeURL?.url ?? null);
				}
			}
			catch (err) {
				handleError(err, { onReconnect: () => window.location.reload() })
			}
		});
		return () => cancelIdle(idleId);
	}, []);

	const url = file.category === 'video' ? videoData?.thumbnail : largeURL ?? data?.url;
	const notFound = data?.notFound || videoData?.notFound;
	const { handleError } = useErrorHandler()

	const fileContextMenuActions = [
		{
			actionName: 'save',
			onClick: async () => {
				const telegramLink = `https://t.me/c/${(user.channelId ?? '').replace('-100', '')}/${file.fileTelegramId}`;
				openModal({
					title: '📥 Save this file',
					forceDialog: true,
					content: (
						<div className="space-y-4">
							<p className="text-sm text-muted-foreground">
								Your files are stored in Telegram, so to save them you just need to open the
								file in Telegram and tap <strong>Download</strong> there — it&apos;s quick
								and easy!
							</p>
							<p className="text-sm text-muted-foreground">
								Click <strong>&quot;Open in Telegram&quot;</strong> below and Telegram will
								open the file for you. From there, hit the download button to save it to
								your device.
							</p>
							<div className="flex justify-end gap-3">
								<Button variant="outline" onClick={() => closeModal()}>
									Cancel
								</Button>
								<Button
									onClick={() => {
										closeModal();
										window.open(telegramLink, '_blank', 'noopener,noreferrer');
									}}
								>
									Open in Telegram
								</Button>
							</div>
						</div>
					)
				});
			},
			Icon: CloudDownload,
			className: 'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-muted'
		},
		{
			actionName: 'delete',
			onClick: async () => {
				if (!client) return;
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

				const promies = async () =>
					await withTelegramConnection(client, async (client) => {
						await Promise.all([deleteFile(file.id), deleteItem(user, file.fileTelegramId, client)]);
					})

				toast.promise(promies, {
					loading: 'please wait',
					success: 'you have successfully deleted the file',
					error: 'Failed to Delete the file'
				})

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
						<p className="text-sm font-medium text-destructive">File not found in Telegram</p>
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
					{(isPending || videoIsPending) && (
						<div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-[2px]">
							<Loader2 className="h-8 w-8 animate-spin text-primary" />
						</div>
					)}
					{file.category == 'image' ? (
						<FileModalView
							key={file.id}
							id={file.id}
							queryKey={QUERY_KEYS.image(file.id)}
							modalContent={
								<ImagePreviewModal fileData={{ ...file, category: 'image' }} url={url || getFilePlaceholder(file) || ''} />
							}
						>
							<ImageRender fileName={file.fileName} url={url || getFilePlaceholder(file)} />
						</FileModalView>
					) : null}
					{file.category == 'application' ? (
						<ImageRender fileName={file.fileName} url={url || getFilePlaceholder(file)} />
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
									user={user}
								/>
							}
						>
							<div className="w-full h-full min-w-full flex-1 relative">
								<ImageRender key={url} fileName={file.fileName} url={url ?? getFilePlaceholder(file) ?? ''} />
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
									fileData={{ ...file, category: 'audio' }}
									user={user}
								/>
							}
						>
							<ImageRender fileName={file.fileName} url={getFilePlaceholder(file) ?? ''} />
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
				sizes="(min-width: 1024px) 50vw, (min-width: 768px) 33vw, 100vw"
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

const VideoMediaView = React.memo(
	({
		fileData,
		user,
		queryKey
	}: {
			fileData: Omit<FilesData[number], 'category'> & { category: 'video' };
		queryKey: string;
		user: User;
	}) => {
		let self = useRef<HTMLVideoElement>(null);
		const playerRef = useRef<FluidPlayerInstance>(undefined);
		const abortController = useGlobalStore(s => s.abortController)
		const setAbortController = useGlobalStore(s => s.setAbortController)
		const audioRef = useGlobalStore(s => s.audioRef)
		const setVideoRef = useGlobalStore(s => s.setVideoRef)
		const [error, setError] = useState<string | null>(null);
		const { handleError } = useErrorHandler()
		const client = useGlobalStore(s => s.client)

		const { data } = useQuery<{ url?: string }>({
			queryKey: [queryKey],
			staleTime: 0,
			queryFn: async () => {
				try {
					if (!client) return { url: undefined };
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

					audioRef?.current?.pause()
					abortController?.abort();
					const newAbortController = new AbortController()
					setAbortController(newAbortController)

					const mediaSource = new MediaSource();
					const url = URL.createObjectURL(mediaSource);

					withTelegramConnection(client, async (client) => {
						await streamMedia({
							client,
							media: message as Message['media'],
							mimeType: fileData.mimeType,
							mediaSource,
							signal: newAbortController.signal
						}, (err: unknown) => {
							const message = err instanceof Error ? err.message : 'Failed to stream media'
							setError(message);
						});
					});
					return { url };
				} catch (err) {
					handleError(err, { onReconnect: () => window.location.reload() })
					setError('Failed to stream media');
					return { url: undefined }
				}
			}
		});

		useEffect(() => {
			if (!playerRef.current && self.current) {
				setVideoRef(self)
				playerRef.current = fluidPlayer(self.current, {
					layoutControls: {
						allowDownload: false,
						controlForwardBackward: {
							show: false,
							doubleTapMobile: false
						},
						autoPlay: true,
						logo: {
							imageUrl: '/TGCloud_PWA_icon_96x96.png',
							position: 'top left',
							imageMargin: '10px'
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

			return () => {
				if (playerRef.current) {
					playerRef.current.destroy();
					playerRef.current = undefined;
					setVideoRef({ current: null });
				}
			};
		}, [fileData.id]);

		return (
			<div className="flex flex-col h-full">
				<div className="flex-1 overflow-y-auto">
					<div className="relative aspect-video">
						<div>
							{error && (
								<div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80 text-white text-center px-6">
									<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
										<circle cx="12" cy="12" r="10" />
										<line x1="12" x2="12" y1="8" y2="12" />
										<line x1="12" x2="12.01" y1="16" y2="16" />
									</svg>
									<p className="text-lg font-semibold text-white">Playback failed</p>
									<p className="text-sm text-white/70 max-w-xs">Something went wrong while loading the video. This can happen due to a network issue or an unsupported format.</p>
								</div>
							)}
						</div>

						<video
							ref={self}
							controls
							autoPlay
							className="w-full h-full object-contain"
							src={data?.url}
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
	}
);

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
	fileData
}: {
		fileData: Omit<FilesData[number], 'category'> & { category: 'audio' };
	user: NonNullable<User>;
}) {
	const audioPlayer = useGlobalStore((s) => s.audioPlayer);
	const setAudioPlayer = useGlobalStore((s) => s.setAudioPlayer);
	const updateAudioPlayer = useGlobalStore((s) => s.updateAudioPlayer);

	const closeModal = useGlobalModal(s => s.closeModal)
	const audioRef = useGlobalStore((s) => s.audioRef);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const duration = audioPlayer?.duration;
	const isCurrentFile = audioPlayer?.fileTelegramId === fileData.fileTelegramId;
	const isLoading = audioPlayer?.isLoading;
	const error = audioPlayer?.error

	useEffect(() => {
		if (!isCurrentFile) {
			if (audioRef?.current) {
				audioRef?.current?.pause();
				audioRef.current.currentTime = 0;
			}
			setAudioPlayer({
				fileData: {
					...fileData,
					folderId: '0',
					date: fileData.date ?? new Date().toISOString()
				} as FileItem,
				isLoading: !!audioPlayer?.isLoading,
				blobURL: '',
				error: null,
				isMinimized: false,
				duration: 0,
				fileTelegramId: fileData.fileTelegramId
			});
		} else {
			audioRef?.current?.play();
			updateAudioPlayer({ isMinimized: false });
		}
	}, [isCurrentFile, audioPlayer?.fileTelegramId]);

	useEffect(() => {
		const el = audioRef?.current;
		if (!el) return;
		const onPlay = () => setIsPlaying(true);
		const onPause = () => setIsPlaying(false);
		const onTimeUpdate = () => setCurrentTime(el.currentTime);
		const onEnded = () => {
			setIsPlaying(false);
			setCurrentTime(0);
		};

		el.addEventListener('play', onPlay);
		el.addEventListener('pause', onPause);
		el.addEventListener('timeupdate', onTimeUpdate);
		el.addEventListener('ended', onEnded);

		setIsPlaying(!el.paused);
		setCurrentTime(el.currentTime);
		return () => {
			el.removeEventListener('play', onPlay);
			el.removeEventListener('pause', onPause);
			el.removeEventListener('timeupdate', onTimeUpdate);
			el.removeEventListener('ended', onEnded);
		};
	}, [audioRef, audioPlayer?.fileTelegramId]);

	const handlePlayPause = () => {
		const el = audioRef?.current;
		if (!el) return;
		if (el.paused) {
			el.play().catch(() => { });
		} else {
			el.pause();
		}
	};

	const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
		const el = audioRef?.current;
		if (!el) return;
		el.currentTime = Number(e.target.value);
		setCurrentTime(Number(e.target.value));
	};

	const handleMinimize = () => {
		closeModal(false)
		updateAudioPlayer({ isMinimized: true });
	};

	return (
		<div className="flex flex-col h-full">
			<div className="flex-1 overflow-y-auto">
				<div className="relative aspect-square flex items-center justify-center bg-muted rounded-t-lg overflow-hidden">
					{!!error && (
						<div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/80 text-white text-center px-6">
							<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
								<circle cx="12" cy="12" r="10" />
								<line x1="12" x2="12" y1="8" y2="12" />
								<line x1="12" x2="12.01" y1="16" y2="16" />
							</svg>
							<p className="text-lg font-semibold text-white">Playback failed</p>
							<p className="text-sm text-white/70 max-w-xs leading-relaxed">Failed to play audio. The file might be corrupted or in an unsupported format.</p>
						</div>
					)}
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

					<div className="flex flex-col gap-1">
						<input
							type="range"
							min={0}
							max={duration || 0}
							value={currentTime}
							onChange={handleSeek}
							className="w-full accent-primary"
						/>
						<div className="flex justify-between text-xs text-muted-foreground">
							<span>
								{Math.floor(currentTime / 60)}:{('0' + Math.floor(currentTime % 60)).slice(-2)}
							</span>
							<span>
								{duration
									? `${Math.floor(duration / 60)}:${('0' + Math.floor(duration % 60)).slice(-2)}`
									: '--:--'}
							</span>
						</div>
					</div>


					{/* Play / Pause */}
					<div className="flex justify-center">
						<Button
							onClick={handlePlayPause}
							variant="outline"
							size="icon"
							className="h-12 w-12 rounded-full"
							disabled={isLoading}
						>
							{isLoading ? (
								<Loader2 className="h-6 w-6 animate-spin" />
							) : isPlaying ? (
								<Pause className="h-6 w-6" />
							) : (
								<Play className="h-6 w-6" />
							)}
						</Button>
					</div>

					<div className="flex flex-col gap-2 mt-2 text-muted-foreground text-sm">
						<div className="flex items-center gap-2">
							<span>Size:</span>
							<span>{formatBytes(Number(fileData.size))}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
