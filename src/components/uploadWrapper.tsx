'use client';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { User } from '@/lib/types';
import { useState } from 'react';
import { UploadIcon } from './Icons/icons';
import { UploadFiles } from './upload-files';
import { useMediaQuery } from './useMediaQuery';
export default function DrawerDialogDemo({ user }: { user: User }) {
	const [open, setOpen] = useState(false);
	const isDesktop = useMediaQuery('(min-width: 768px)');

	if (isDesktop) {
		return (
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<DialogTrigger>
						<div className="flex justify-center items-center gap-2">
							<UploadIcon className="h-4 w-4" />
							Upload
						</div>
					</DialogTrigger>
				</DialogTrigger>
				<DialogContent className="w-[700px]">
					<DialogTitle className="sr-only">upload file</DialogTitle>
					<UploadFiles setOpen={setOpen} user={user} />
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<DrawerTrigger asChild>
				<DialogTrigger>
					{' '}
					<div className="flex justify-center items-center gap-2">
						<UploadIcon className="h-4 w-4" />
						Upload
					</div>
				</DialogTrigger>
			</DrawerTrigger>
			<DrawerContent className="h-4/5">
				<UploadFiles setOpen={setOpen} user={user} />
			</DrawerContent>
		</Drawer>
	);
}
