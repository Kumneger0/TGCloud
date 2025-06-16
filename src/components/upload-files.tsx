import { Button } from '@/components/ui/button';
import { getGlobalTGCloudContext } from '@/lib/context';
import { promiseToast } from '@/lib/notify';
import { User } from '@/lib/types';
import { formatBytes, uploadFiles } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dispatch, SetStateAction, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Dropzone from 'react-dropzone';
import { CloudUploadIcon, FileIcon, TrashIcon, UploadIcon, XIcon } from './Icons/icons';
import { UploadProgressOverlay } from './uploadProgressOverlay';
import { getTgClient } from '@/lib/getTgClient';

interface DropedFile {
	file: File;
	id: string;
}

interface UploadProgress {
	itemName: string;
	itemIndex: number;
	progress: number;
}

export const UploadFiles = ({
	user,
	setOpen
}: {
	user: User;
	setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
	const router = useRouter();
	const [dropedfiles, setFiles] = useState<DropedFile[]>([]);
	const tgCloudContext = getGlobalTGCloudContext();
	const searchParams = useSearchParams();
	const folderId = searchParams?.get('folderId') ?? null;

	const handleDrop = (acceptedFiles: File[]) => {
		const files = acceptedFiles.map((file) => ({
			file,
			id: crypto.randomUUID()
		}));
		setFiles(files);
	};

	const handleSubmit = async (formData: FormData) => {
		if (tgCloudContext?.botRateLimit.isRateLimited) return null;
		const client = await getTgClient({ setBotRateLimit: tgCloudContext?.setBotRateLimit });
		type UploadProgresFnType = NonNullable<typeof tgCloudContext>['setUploadProgress'];

		const setUploadProgressFn: UploadProgresFnType = (progress) => {
			console.log(progress);
		};

		await promiseToast({
			cb: () => {
				setOpen(false);
				return uploadFiles(
					formData,
					user,
					tgCloudContext?.setUploadProgress || setUploadProgressFn,
					client,
					folderId
				);
			},
			errMsg: 'We apologize, but there was an error uploading your files',
			successMsg: 'File Uploaded',
			loadingMsg: 'please wait',
			position: 'top-right'
		});
		tgCloudContext?.setUploadProgress?.(undefined);
		setFiles([]);
		router.refresh();
	};

	if (tgCloudContext?.botRateLimit.isRateLimited) return null;

	return (
		<>
			<div className="bg-red-500 text-white p-4 rounded-md">
				<p>Please do not close the site or refresh the page while uploading files.</p>
			</div>
			<div className="grid gap-6 max-w-xl overflow-x-hidden mx-auto">
				<form
					action={async () => {
						const formData = new FormData();
						if (!dropedfiles.length) return;
						for (const { file } of dropedfiles) {
							formData.append('files', file);
						}
						await handleSubmit(formData);
					}}
				>
					<Dropzone onDrop={handleDrop}>
						{({ getRootProps, getInputProps, isDragActive }) => (
							<div
								{...getRootProps()}
								className={`flex flex-col items-center justify-center gap-4 px-6 py-12 border-2 border-dashed rounded-lg transition-colors w-full ${
									isDragActive ? 'border-primary' : 'border-primary-foreground'
								}`}
							>
								<CloudUploadIcon className="w-10 h-10 text-primary" />
								<h3 className="text-2xl font-bold">Upload Files</h3>
								<p className="text-muted-foreground">Drag and drop files here or click to select</p>
								<input
									{...getInputProps()}
									type="file"
									multiple
									name="files"
									className="file-input"
								/>
							</div>
						)}
					</Dropzone>
					<div className="grid gap-4">
						<div className="grid grid-cols-[1fr_auto] items-center gap-4">
							<h4 className="text-lg font-medium">Selected Files</h4>
							<button type="button" className="outline-button" onClick={() => setFiles([])}>
								<span className="flex justify-center items-center">
									<TrashIcon className="w-4 h-4 mr-2" />
									<span> Clear All</span>
								</span>
							</button>
						</div>
						<div className="grid gap-2 my-3 max-h-80 overflow-y-auto">
							{dropedfiles.map(({ file, id }) => (
								<div key={id} className="flex items-center justify-between bg-muted p-4 rounded-md">
									<div className="flex items-center gap-4 max-w-md overflow-x-hidden">
										<FileIcon className="w-6 h-6 text-muted-foreground" />
										<div>
											<div className="font-medium text-clip break-words">{file.name}</div>
											<div className="text-sm text-muted-foreground">{formatBytes(file.size)}</div>
										</div>
									</div>
									<button
										type="button"
										onClick={() => setFiles(dropedfiles.filter((f) => f.id !== id))}
										className="ghost-button"
									>
										<XIcon className="w-4 h-4" />
										<span className="sr-only">Remove</span>
									</button>
								</div>
							))}
						</div>
					</div>
					<UploadButton dropedfiles={dropedfiles} />
				</form>
			</div>
		</>
	);
};

function UploadButton({ dropedfiles }: { dropedfiles: DropedFile[] }) {
	const status = useFormStatus();
	const isDisabled = status.pending || !dropedfiles?.length;

	return (
		<Button disabled={isDisabled} type="submit" className="justify-center">
			<UploadIcon className="w-4 h-4 mr-2" />
			{status.pending ? 'please wait ...' : 'Upload Files'}
		</Button>
	);
}
