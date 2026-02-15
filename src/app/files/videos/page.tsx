import { getFolderContents, requireUserAuthentication } from '@/actions';
import { Dashboard } from '@/components/dashboard';
import Files from '@/components/FilesRender';
import { LoadingItems } from '@/components/loading-files';
import { USER_TELEGRAM_SESSION_COOKIE_NAME } from '@/lib/consts';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
export default async function Home(props: { searchParams: Promise<Record<string, string>> }) {
	const searchParams = await props.searchParams;
	const user = await requireUserAuthentication();
	const page = parseInt(searchParams.page || '1');
	const currentFolderId = searchParams.folderId || null;
	const searchItem = searchParams.search;
	const folderContents = await getFolderContents(
		currentFolderId,
		searchItem,
		(page - 1) * 8,
		'video'
	);
	if (!folderContents) return null;

	const cookieStore = await cookies();
	const stringSession = cookieStore.get(USER_TELEGRAM_SESSION_COOKIE_NAME)?.value;

	const { folders, files, totalFiles } = folderContents;
	return (
		<Dashboard
			currentFolderId={currentFolderId}
			folders={folders}
			total={totalFiles}
			user={{ ...user, telegramSession: stringSession || undefined, plan: user.plan }}
		>
			<Suspense fallback={<LoadingItems />}>
				<Files
					files={files}
					folders={folders}
					user={{ ...user, telegramSession: stringSession || undefined, plan: user.plan }}
					currentFolderId={currentFolderId}
				/>
			</Suspense>
		</Dashboard>
	);
}
