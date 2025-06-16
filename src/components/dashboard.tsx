import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { GetAllFilesReturnType, User } from '@/lib/types';
import { File, Menu } from 'lucide-react';
import { cookies } from 'next/headers';
import React, { Suspense } from 'react';
import { ModeToggle } from './darkmodeToggle';
import { CloudIcon, FileTextIcon, ImageIcon, Music2Icon, VideoIcon } from './Icons/icons';
import Link from './Link';
import Paginate from './pagination';
import ProfileMenu from './profileMenu';
import SearchItems from './searchItems';
import SortBy from './SortBy';
import SpaceUsageIndicator from './storageSpaceIndicator';
import StoragePage from './folderPath';
import { getFolderHierarchy, getAllFolders } from '@/actions';
import { unstable_cache } from 'next/cache';
import UploadFile from './uploadWrapper';
import { UploadProgressOverlay } from './uploadProgressOverlay';

const allfolders = unstable_cache(getAllFolders, [], { revalidate: 3600, tags: ['get-folder'] });
export async function Dashboard({
	children,
	user,
	total,
	folders,
	currentFolderId
}: {
	children: React.ReactNode;
	user: User;
	total: number;
	folders: NonNullable<GetAllFilesReturnType>['folders'] | undefined;
	currentFolderId: string | null;
}) {
	const calculateRemainingDays = (subscriptionDate: string) => {
		const currentDate = new Date();
		const expirationDate = new Date(subscriptionDate);
		const differenceInTime = expirationDate.getTime() - currentDate.getTime();
		const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));
		return differenceInDays;
	};

	const foldersHierarchy = await getFolderHierarchy(user?.id as string);
	const allFolders = await allfolders(user?.id as string);

	const isSubscribedToPro = user?.isSubscribedToPro;
	const subscriptionDate = user?.subscriptionDate;

	return (
		<>
			<UploadProgressOverlay />
			<div className="grid min-h-screen relative w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
				<div className="hidden max-h-svh  sticky top-0 overflow-y-hidden border-r bg-muted/40 md:block">
					<div className="flex  h-full max-h-screen flex-col gap-2">
						<div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
							<Link href="/" className="flex items-center gap-2 font-semibold">
								<CloudIcon className="h-6 w-6" />
								<span>TG Cloud</span>
							</Link>
						</div>
						<div className="flex-1">
							<nav className="grid items-start px-2 text-sm font-medium lg:px-4">
								<Link
									href="/files"
									className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
								>
									<File className="h-5 w-5" />
									All files
								</Link>
								<Link
									href="/files/images"
									className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
								>
									<ImageIcon className="h-5 w-5" />
									Images
								</Link>
								<Link
									href="/files/videos"
									className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
								>
									{' '}
									<VideoIcon className="h-5 w-5" />
									Videos
								</Link>
								<Link
									href="/files/documents"
									className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
								>
									<FileTextIcon className="h-5 w-5" />
									Documents
								</Link>
								<Link
									href="/files/audios"
									className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
								>
									<Music2Icon className="h-5 w-5" />
									Audio
								</Link>
							</nav>
						</div>
						<div className="mt-auto p-4">
							<div className="mt-auto">
								<Card>
									<CardHeader>
										<CardTitle>Channel</CardTitle>
									</CardHeader>
									<CardContent>
										<Button size="sm" className="w-full">
											<Link
												target="_blank"
												href={
													user?.hasPublicTgChannel
														? 'https://t.me/' + user?.channelUsername!
														: `https://t.me/c/${user?.channelId}/1`
												}
												className="text-muted-foreground font-bold no-underline"
											>
												View in Telegram
											</Link>
										</Button>
									</CardContent>
								</Card>
							</div>
						</div>
						<div className="flex items-center justify-center mb-4">
							<UploadFile user={user} />
						</div>
						<div className="flex items-center justify-center mb-4">
							<SpaceUsageIndicator />
						</div>
						<div className="flex items-center justify-center mb-4">
							<ProfileMenu />
						</div>
					</div>
				</div>
				<div className="flex flex-col">
					<header className="flex h-14 bg-white sticky z-50 top-0 items-center gap-4 border-b dark:bg-black/95  px-4 lg:h-[60px] lg:px-6">
						<Sheet>
							<SheetTrigger asChild>
								<Button variant="outline" size="icon" className="shrink-0 md:hidden">
									<Menu className="h-5 w-5" />
									<span className="sr-only">Toggle navigation menu</span>
								</Button>
							</SheetTrigger>
							<SheetContent side="left" className="flex flex-col">
								<nav className="grid gap-2 text-lg font-medium">
									<Link href="/files" className="flex items-center gap-2 text-lg font-semibold">
										<CloudIcon className="h-6 w-6" />
										<span>TG Cloud</span>
									</Link>
									<Link
										href="/files"
										className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
									>
										<File className="h-5 w-5" />
										All files
									</Link>
									<Link
										href="/files/images"
										className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
									>
										<ImageIcon className="h-5 w-5" />
										Images
									</Link>
									<Link
										href="/files/videos"
										className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
									>
										<VideoIcon className="h-5 w-5" />
										Videos
									</Link>
									<Link
										href="files/documents"
										className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
									>
										<FileTextIcon className="h-5 w-5" />
										Documents
									</Link>
									<Link
										href="/files/audios"
										className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
									>
										<Music2Icon className="h-5 w-5" />
										Audio
									</Link>
								</nav>
								<div className="mt-auto">
									<Card>
										<CardHeader>
											<CardTitle>Channel</CardTitle>
										</CardHeader>
										<CardContent>
											<Button size="sm" className="w-full">
												<Link
													target="_blank"
													href={
														user?.hasPublicTgChannel
															? 'https://t.me/' + user?.channelUsername!
															: `https://t.me/c/${user?.channelId}/1`
													}
													className="text-muted-foreground font-bold no-underline"
												>
													View in Telegram
												</Link>
											</Button>
										</CardContent>
									</Card>
								</div>
								<div className="flex items-center justify-center mb-4">
									<UploadFile user={user} />
								</div>
								<div className="flex items-center justify-center mb-4">
									<SpaceUsageIndicator />
								</div>
								<div className="flex items-center justify-center mb-4">
									<ProfileMenu />
								</div>
							</SheetContent>
						</Sheet>
						<SearchItems />
						<div>
							<ModeToggle />
						</div>
						<SortBy />
					</header>
					<main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
						<StoragePage
							allFolder={allFolders}
							foldersHierarchy={foldersHierarchy}
							userId={user?.id as string}
							folders={folders ?? []}
							currentFolderId={currentFolderId}
						/>
						<Suspense fallback={<div>loading</div>}>{children}</Suspense>
						<Paginate totalItems={total} />
					</main>
				</div>
			</div>
		</>
	);
}
