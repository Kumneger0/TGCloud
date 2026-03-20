'use client';
import { getNewTelegramIds, importSyncedFiles } from '@/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { messageCacheDb } from '@/lib/dexie';
import { getTgClient } from '@/lib/getTgClient';
import { withTelegramConnection } from '@/lib/telegramMutex';
import Message, { FileItem } from '@/lib/types';
import { cn, downloadMedia, downloadVideoThumbnail, formatBytes, getFilePlaceholder, getMediaCategory, getMessage, MediaCategory } from '@/lib/utils';
import { useGlobalStore } from '@/store/global-store';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Api } from 'telegram';

export type SyncCandidate = {
	fileTelegramId: string;
	fileName: string;
	mimeType: string;
	size: bigint;
	url: string;
	date: string;
	category: MediaCategory;
};

type Props = {
	currentFolderId: string | null;
	onSuccess: () => void;
	onClose: () => void;
};

const ITEMS_PER_PAGE = 8;
const TELEGRAM_BATCH_SIZE = 50;
const TELEGRAM_SCAN_LIMIT = 200;

export function SyncFromTelegramModal({
	currentFolderId,
	onSuccess,
	onClose
}: Props) {
	const client = useGlobalStore((s) => s.client);
	const user = useGlobalStore((s) => s.user);
	const setBotRateLimit = useGlobalStore((s) => s.setBotRateLimit);
	const { handleError } = useErrorHandler();

	const [state, setState] = useState({
		candidates: [] as SyncCandidate[],
		currentPage: 1,
		isScanning: false,
		scanCount: 0,
		hasMoreTelegram: true,
	});

	const fetchMore = async (isInitial = false) => {
		if (!user) throw new Error('Missing user');
		if (user.authType == "bot") {
			toast.error('Not supported in bot mode');
			return
		}
		let tgClient = client;
		if (!tgClient) {
			const getTgClientArgs: Parameters<typeof getTgClient>[0] = user.authType === 'user' ? {
				authType: 'user',
				stringSession: user.telegramSession ?? "",

			} : {
				authType: 'bot',
				setBotRateLimit
			}
			tgClient = await getTgClient(getTgClientArgs) ?? null;
		}


		if (!tgClient) {
			toast.error('Failed to get Telegram client');
			return;
		}

		if (!user?.channelId) throw new Error('Missing channel id');
		if (state.scanCount >= TELEGRAM_SCAN_LIMIT) {
			toast.error(`Already scanned ${TELEGRAM_SCAN_LIMIT} files`);
			return;
		}

		setState(prev => ({ ...prev, isScanning: true }));
		const toastId = toast.loading(isInitial ? 'Scanning for new files...' : 'Fetching more files...');
		try {
			const channelId = user.channelId.startsWith('-100')
				? user.channelId
				: `-100${user.channelId}`;
			const entity = await withTelegramConnection(tgClient, (c) => c.getInputEntity(channelId));

			let currentOffsetId = isInitial ? undefined : state.candidates.at(-1)?.fileTelegramId;
			let newlyFound: SyncCandidate[] = [];
			let hasMore = true;
			let scannedCount = state.scanCount

			while (newlyFound.length === 0 && hasMore) {
				if (scannedCount >= TELEGRAM_SCAN_LIMIT) {
					break;
				}
				const cacheKey = `telegram-messages-${user.id}-${currentOffsetId}-${user.channelId}`;

				const cachedMessages = currentOffsetId ? await messageCacheDb.messageCache.get({ cacheKey }) : null;
				const messages = await withTelegramConnection(tgClient, (c) => c.getMessages(entity, {
					limit: TELEGRAM_BATCH_SIZE,
					offsetId: currentOffsetId ? Number(currentOffsetId) : undefined
				}))

				if (!messages || messages.length === 0) {
					hasMore = false;
					break;
				}


				scannedCount += messages.length
				if (messages.length < TELEGRAM_BATCH_SIZE) {
					hasMore = false;
				}

				const lastMessage = messages.at(-1);
				if (lastMessage && 'id' in lastMessage) {
					currentOffsetId = String(lastMessage.id);
				}
				let mapped: SyncCandidate[] = [];
				if (cachedMessages) {
					mapped = cachedMessages.data
				} else {
					mapped = messages
						.filter((m) => m && 'id' in m && m.id && 'media' in m && m.media)
						.map((m) => {
							const id = String(m.id);
							const media = m.media;
							const doc = media instanceof Api.MessageMediaDocument ? media.document : undefined;
							const photo = media instanceof Api.MessageMediaPhoto ? media.photo : undefined;

							let fileName = `message-${id}`;
							let mimeType = 'application/octet-stream';
							let size = BigInt(0);
							let category: MediaCategory = 'document';

							if (doc instanceof Api.Document) {
								mimeType = String(doc.mimeType ?? mimeType);
								size = BigInt(doc.size?.toString() ?? '0');
								category = getMediaCategory(mimeType);
								const attrs = Array.isArray(doc.attributes) ? doc.attributes : [];
								const nameAttr = attrs.find((a) => a instanceof Api.DocumentAttributeFilename);
								if (nameAttr instanceof Api.DocumentAttributeFilename) fileName = String(nameAttr.fileName);
							}
							if (!doc && photo instanceof Api.Photo) {
								mimeType = 'image/jpeg';
								category = 'image';
								const photoSizes = Array.isArray(photo.sizes) ? photo.sizes : [];
								const maxSize = photoSizes.reduce((acc: number, s) => {
									const size = 'size' in s ? Number(s.size) : 0;
									return size > acc ? size : acc;
								}, 0);
								size = BigInt(maxSize);
								fileName = `photo-${id}.jpg`;
							}

							const privateChannelId = String(user.channelId ?? '').replace('-100', '');
							const url = user.hasPublicTgChannel && user.channelUsername
								? `https://t.me/${user.channelUsername}/${id}`
								: `https://t.me/c/${privateChannelId}/${id}`;

							const dateStr = m.date
								? new Date(Number(m.date) * 1000).toDateString()
								: new Date().toDateString();

							return {
								fileTelegramId: id,
								fileName,
								mimeType,
								size,
								url,
								date: dateStr,
								category
							};
						});
				}

				messageCacheDb.messageCache.add({
					cacheKey,
					data: mapped,
					id: Date.now()
				})

				if (mapped.length > 0) {
					const newIds = await getNewTelegramIds(mapped.map(c => c.fileTelegramId));
					const newIdsSet = new Set(newIds);
					newlyFound = mapped
						.filter(c => newIdsSet.has(c.fileTelegramId));
				}
			}

			if (newlyFound.length > 0) {
				setState(prev => {
					const existingIds = new Set(prev.candidates.map(p => p.fileTelegramId));
					const trulyNew = newlyFound.filter(f => !existingIds.has(f.fileTelegramId));
					return {
						...prev,
						candidates: [...prev.candidates, ...trulyNew],
						currentPage: isInitial ? prev.currentPage : prev.currentPage + 1
					};
				});

				toast.success(`Found ${newlyFound.length} new files!`, { id: toastId });
			} else {
				toast.success('No new files found in your channel', { id: toastId });
			}


			setState(prev => ({ ...prev, scanCount: scannedCount }))
			if (!hasMore) {
				setState(prev => ({ ...prev, hasMoreTelegram: false }));
			}
		} catch (err) {
			handleError(err, { onReconnect: () => window.location.reload() });
		} finally {
			setState(prev => ({ ...prev, isScanning: false }));
		}
	}

	const importMut = useMutation({
		mutationFn: async (selectedIds: string[]) => {
			const toImport = state.candidates.filter((c) => selectedIds.includes(c.fileTelegramId));
			if (toImport.length === 0) throw new Error('No files selected');
			await importSyncedFiles(
				toImport.map((c) => ({
					fileName: c.fileName,
					mimeType: c.mimeType,
					size: c.size,
					url: c.url,
					fileTelegramId: c.fileTelegramId,
					folderId: currentFolderId,
					date: c.date
				} satisfies Omit<FileItem, 'id' | 'userId' | 'category'>))
			);
			return toImport.length;
		},
		onSuccess: (count) => {
			toast.success(`Synced ${count} file${count === 1 ? '' : 's'} successfully`);
			onSuccess();
		},
		onError: (err) => {
			const message = err instanceof Error ? err.message : 'Failed to sync files';
			toast.error(message);
		}
	});

	const [selected, setSelected] = useState<Record<string, boolean>>({});

	const handleImport = async () => {
		const selectedIds = Object.entries(selected)
			.filter(([, v]) => v)
			.map(([k]) => k);
		if (selectedIds.length === 0) {
			toast.error('Select at least one file');
			return;
		}
		importMut.mutate(selectedIds);
	}

	const totalPagesInBuffer = Math.ceil(state.candidates.length / ITEMS_PER_PAGE);
	const currentItems = state.candidates.slice((state.currentPage - 1) * ITEMS_PER_PAGE, state.currentPage * ITEMS_PER_PAGE);

	const handleNext = async () => {
		if (state.currentPage < totalPagesInBuffer) {
			setState(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
		} else if (state.hasMoreTelegram) {
			await fetchMore();
		}
	}

	const handlePrev = () => {
		if (state.currentPage > 1) {
			setState(prev => ({ ...prev, currentPage: prev.currentPage - 1 }));
		}
	}

	const selectAll = () => {
		setSelected(Object.fromEntries(state.candidates.map((c) => [c.fileTelegramId, true])));
	}
	const selectNone = () => {
		setSelected({});
	}

	if (user?.authType === 'bot') {
		return (
			<div className="flex flex-col items-center justify-center h-[75vh] gap-4 p-8 text-center">
				<div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-2">
					<AlertCircle className="w-8 h-8 text-amber-500" />
				</div>
				<h3 className="text-xl font-semibold">Not Supported in Bot Mode</h3>
				<p className="text-sm text-muted-foreground max-w-md mx-auto">
					Scanning and syncing files directly from your Telegram channel is only available in User Mode. Please switch to User Mode if you want to use this feature.
				</p>
				<Button variant="outline" onClick={onClose} className="mt-4 min-w-32">
					Close
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 h-[75vh]">
			<div className="flex items-center justify-between gap-3 shrink-0 py-2">
				<div className="flex flex-col gap-1.5">
					<Button variant="outline" disabled={state.isScanning} onClick={() => fetchMore(true)}>
						{state.isScanning && state.candidates.length === 0 ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Scanning…
							</>
						) : (
							'Scan for new files'
						)}
					</Button>
					<div className={cn(
						"text-[10px] px-1.5 py-1 rounded-md transition-all duration-300",
						state.scanCount >= TELEGRAM_SCAN_LIMIT
							? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 border border-amber-500/20"
							: "text-muted-foreground"
					)}>
						{state.scanCount >= TELEGRAM_SCAN_LIMIT && <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
						<span>
							{state.scanCount >= TELEGRAM_SCAN_LIMIT
								? `Scan limit reached: We have already scanned the last ${TELEGRAM_SCAN_LIMIT} messages.`
								: `Scanning up to ${TELEGRAM_SCAN_LIMIT} messages gradually for efficiency.`
							}
						</span>
					</div>
				</div>
				<div className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
					Found {state.candidates.length} file(s) not in TGCloud
				</div>
			</div>

			<div className="flex-1 overflow-y-auto rounded-xl border border-border bg-muted/30 p-4">
				{state.candidates.length === 0 ? (
					<div className="h-full flex flex-col items-center justify-center text-center p-8">
						<div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
							<Loader2 className="w-8 h-8 text-muted-foreground/50" />
						</div>
						<h3 className="text-lg font-medium">No files scanned yet</h3>
						<p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
							Scan to see files uploaded directly in your channel. We check up to {TELEGRAM_SCAN_LIMIT} messages gradually for efficiency.
						</p>
					</div>
				) : (
					<>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
							{currentItems.map((c) => (
								<div
									key={c.fileTelegramId}
									className={cn(
										"group relative flex flex-col bg-background rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-md overflow-hidden",
										selected[c.fileTelegramId] && "ring-2 ring-primary border-primary"
									)}
								>
									<div className="absolute top-2 left-2 z-10">
										<Input
											type="checkbox"
											checked={!!selected[c.fileTelegramId]}
											onChange={(e) => {
												setSelected((prev) => ({ ...prev, [c.fileTelegramId]: e.target.checked }));
											}}
											className="w-5 h-5 cursor-pointer shadow-sm"
										/>
									</div>

									<div className="aspect-video w-full bg-muted flex items-center justify-center overflow-hidden border-b border-border">
										<SyncCandidatePreview c={c} />
									</div>

									<div className="p-3 flex flex-col flex-1 min-w-0">
										<div className="font-medium text-sm truncate mb-1" title={c.fileName}>
											{c.fileName}
										</div>
										<div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mb-2">
											<span className="truncate">{c.mimeType}</span>
											<span>•</span>
											<span className="shrink-0">{formatBytes(Number(c.size))}</span>
										</div>

										<div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2 leading-none">
											<span className="text-[10px] text-muted-foreground truncate">
												{c.date}
											</span>
											<a
												href={c.url}
												target="_blank"
												rel="noopener noreferrer"
												className="text-[10px] font-medium text-primary hover:underline shrink-0"
											>
												View in TG
											</a>
										</div>
									</div>
								</div>
							))}
						</div>

						<div className="flex items-center justify-center gap-4 mt-8 py-4 border-t border-border/50">
							<Button
								variant="outline"
								size="sm"
								onClick={handlePrev}
								disabled={state.currentPage === 1 || state.isScanning}
								className="h-8 px-4"
							>
								Previous
							</Button>
							<div className="flex flex-col items-center">
								<span className="text-xs font-semibold">
									Page {state.currentPage}
								</span>
								<span className="text-[10px] text-muted-foreground">
									{state.candidates.length > 0 ? `${(state.currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(state.currentPage * ITEMS_PER_PAGE, state.candidates.length)} of ${state.candidates.length}+` : ''}
								</span>
							</div>
							<div>
								{state.currentPage === totalPagesInBuffer && state.hasMoreTelegram ?
									<Button
										variant="outline"
										size="sm"
										onClick={handleNext}
										disabled={state.isScanning || state.scanCount >= TELEGRAM_SCAN_LIMIT}
										className="h-8 px-4"
									>
										{state.isScanning ? (
											<>
												<Loader2 className="mr-2 h-3 w-3 animate-spin" />
												Loading…
											</>
										) : (
											'Fetch More'
										)}
									</Button> :
									<Button
										variant="outline"
										size="sm"
										onClick={handleNext}
										disabled={state.isScanning || (state.currentPage === totalPagesInBuffer && !state.hasMoreTelegram)}
										className="h-8 px-4"
									>
										Next
									</Button>
								}
							</div>

						</div>
					</>
				)}
			</div>

			<div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 shrink-0">
				<div className="flex gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={selectAll}
						disabled={state.candidates.length === 0}
						className="text-xs h-8"
					>
						Select all
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={selectNone}
						disabled={state.candidates.length === 0}
						className="text-xs h-8"
					>
						Select none
					</Button>
				</div>
				<div className="flex gap-3 w-full sm:w-auto">
					<Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
						Cancel
					</Button>
					<Button
						disabled={importMut.isPending || state.candidates.length === 0 || !Object.values(selected).some(Boolean)}
						onClick={handleImport}
						className="flex-1 sm:flex-none"
					>
						{importMut.isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Importing…
							</>
						) : (
							`Import Selected (${Object.values(selected).filter(Boolean).length})`
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}

function SyncCandidatePreview({ c }: { c: SyncCandidate }) {
	const client = useGlobalStore((s) => s.client);
	const user = useGlobalStore((s) => s.user);
	const { handleError } = useErrorHandler()

	const { data: previewUrl, isPending } = useQuery({
		queryKey: ['sync-preview', c.fileTelegramId],
		queryFn: async () => {
			if (!user || !client) return null;
			try {
				if (c.category === 'image') {
					const result = await withTelegramConnection(client, async (client) => {
						return await downloadMedia({
							user,
							messageId: c.fileTelegramId,
							size: 'small',
							category: 'image',
							mimeType: c.mimeType
						}, client);
					});
					return result?.url;
				}
				if (c.category === 'video') {
					const media = await withTelegramConnection(client, async (client) => {
						return await getMessage({
							client,
							messageId: c.fileTelegramId,
							user
						}) as Message['media'] | undefined
					});
					if (media) {
						return (await downloadVideoThumbnail(client, media))?.url
					}
				}
				return getFilePlaceholder({ category: c.category, mimeType: c.mimeType })
			} catch (err) {
				console.error(err)
				handleError(err, { onReconnect: () => window.location.reload() })
				return getFilePlaceholder({ category: c.category, mimeType: c.mimeType })
			}
		},
		enabled: !!client && !!user
	});

	return (
		<div className="w-full h-full relative">
			{isPending && (c.category === 'image' || c.category === 'video') ? (
				<div className="absolute inset-0 flex items-center justify-center">
					<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
				</div>
			) : (
				<img
					src={previewUrl || getFilePlaceholder({ category: c.category, mimeType: c.mimeType })}
					alt={c.fileName}
					className="w-full h-full object-cover"
				/>
			)}
		</div>
	);
}
