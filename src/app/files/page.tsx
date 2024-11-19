import { getAllFiles, getFolderContents, requireUserAuthentication } from '@/actions';
import { Dashboard } from '@/components/dashboard';
import Files from '@/components/FilesRender';
import { LoadingItems } from '@/components/loading-files';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const generateMetadata = async (): Promise<Metadata> => {
	return {
		title: 'Files'
	};
};

export default async function Home(props: { searchParams: Promise<Record<string, string>> }) {
	const searchParams = await props.searchParams;
	const user = await requireUserAuthentication();

	const searchItem = searchParams.search;
	const page = parseInt(searchParams.page || '1');
	const currentFolderId = searchParams.folderId || null;

	const folderContents = await getFolderContents(currentFolderId, searchItem, (page - 1) * 8);
	if (!folderContents) return null;

	const { folders, files, totalFiles } = folderContents;

	return (
		<Dashboard currentFolderId={currentFolderId} folders={folders} total={totalFiles} user={user}>
			<Suspense fallback={<LoadingItems />}>
				<Files files={files} folders={folders} user={user} currentFolderId={currentFolderId} />
			</Suspense>
		</Dashboard>
	);
}
