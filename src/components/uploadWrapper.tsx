'use client';
import { User } from '@/lib/types';
import { UploadIcon } from './Icons/icons';
import { UploadFiles } from './upload-files';
import { useGlobalModal } from '@/store/global-modal';

export default function DrawerDialogDemo({ user }: { user: User }) {
	const { openModal } = useGlobalModal();

	const handleOpenUpload = () => {
		openModal({
			title: 'Upload Files',
			content: <UploadFiles user={user} />,
			size: 'md'
		});
	};

	return (
		<div
			onClick={handleOpenUpload}
			className="flex justify-center items-center gap-2 cursor-pointer"
		>
			<UploadIcon className="h-4 w-4" />
			Upload
		</div>
	);
}
