'use client';
import { createFolder, getFolderHierarchy } from '@/actions';
import { Button } from '@/components/ui/button';
import { Folder as FolderType } from '@/lib/types';
import { useCreateQueryString } from '@/lib/utils';
import { ChevronDown, ChevronUp, Folder } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useOptimistic, useState, useTransition } from 'react';
import FolderNavigationBar from './folder-navigation-bar';
import { useGlobalStore } from '@/store/global-store';

export type AllFolder = {
	id: string;
	name: string;
	userId: string;
	parentId: string | null;
	path: string;
	createdAt: string | null;
	updatedAt: string | null;
}[];

interface StoragePageProps {
	folders: FolderType[];
	currentFolderId: string | null;
	userId: string;
	foldersHierarchy: Awaited<ReturnType<typeof getFolderHierarchy>>;
	allFolder: AllFolder;
}

export default function StoragePage({
	folders,
	userId,
	foldersHierarchy,
	currentFolderId,
	allFolder
}: StoragePageProps) {
	const [isFoldersVisible, setIsFoldersVisible] = useState(true);
	const [foldersOptimistic, setFoldersOptimistic] = useOptimistic<FolderType[]>(folders);
	const [currentlySelectedFolderId, setCurrentlySelectedFolderId] = useState(currentFolderId);

	const searchParams = useSearchParams();
	const createQueryString = useCreateQueryString(searchParams);
	const pathname = usePathname();
	const router = useRouter();

	const [pending, startTransition] = useTransition();

	const setIsSwitchingFolder = useGlobalStore((state) => state.setIsSwitchingFolder);

	useEffect(() => {
		setIsSwitchingFolder(pending);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pending]);

	const handleNavigate = (folderId: string | null) => {
		startTransition(() => {
			if (folderId) {
				router.push(`${pathname}?folderId=${folderId}`);
			} else {
				setCurrentlySelectedFolderId(null);
				router.push(`${pathname}`);
			}
		});
	};

	const handleCreateFolder = async (folderName: string) => {
		try {
			setFoldersOptimistic((foldersOptimistic) => [
				...foldersOptimistic,
				{
					id: 'TEMP_FOLDER_ID',
					name: folderName,
					path: '',
					parentId: currentFolderId,
					userId: userId,
					createdAt: new Date().toDateString(),
					updatedAt: new Date().toDateString()
				} satisfies FolderType
			]);
			await createFolder(folderName, currentFolderId);
			router.refresh();
		} catch (error) {
			console.error('Error creating folder:', error);
		}
	};

	return (
		<div className="container mx-auto p-4">
			<FolderNavigationBar
				allFolder={allFolder}
				folders={foldersHierarchy}
				currentFolderId={currentlySelectedFolderId}
				onNavigate={handleNavigate}
				onCreateFolder={handleCreateFolder}
				userId={userId}
			/>
			<div className="mt-4">
				<Button
					variant="ghost"
					className="mb-2 w-full flex items-center justify-between"
					onClick={() => setIsFoldersVisible(!isFoldersVisible)}
				>
					<span>Folders</span>
					{isFoldersVisible ? (
						<ChevronUp className="h-4 w-4" />
					) : (
						<ChevronDown className="h-4 w-4" />
					)}
				</Button>
				<div
					className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 transition-all duration-300 ${
						isFoldersVisible ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0 overflow-hidden'
					}`}
				>
					{foldersOptimistic.map((folder) => {
						const path = `${pathname}?${createQueryString('folderId', folder?.id as string)}`;
						const isTemp = folder?.id === 'TEMP_FOLDER_ID';
						return (
							<Button
								key={folder?.id}
								variant="outline"
								className={`flex items-center justify-start h-12 ${
									isTemp ? 'opacity-50 cursor-not-allowed' : ''
								}`}
								onMouseEnter={() => !isTemp && router.prefetch(path)}
								disabled={isTemp}
								onClick={(e) => {
									if (isTemp) return;
									setCurrentlySelectedFolderId(folder?.id as string);
									const childFolders = allFolder.filter(({ parentId }) => parentId == folder?.id);
									startTransition(() => {
										setFoldersOptimistic(childFolders);
										router.push(path);
									});
								}}
							>
								<Folder className="h-4 w-4 mr-2" />
								{isTemp ? <span className="text-inherit">{folder?.name}</span> : folder?.name}
							</Button>
						);
					})}
				</div>
			</div>
		</div>
	);
}
