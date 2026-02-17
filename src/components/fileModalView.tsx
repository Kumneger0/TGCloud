import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { useCreateQueryString } from '@/lib/utils';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ComponentRef, useRef, useState, type JSX } from 'react';
import { useMediaQuery } from './useMediaQuery';
import { useQueryClient } from '@tanstack/react-query';

export function FileModalView({
	children,
	modalContent,
	id,
	queryKey
}: {
	children: React.ReactNode;
		modalContent: React.ReactNode;
		queryKey: string;
	id: number;
}) {
	const searchParams = useSearchParams();
	const idInURL = searchParams.get('open');
	const [open, setOpen] = useState(false);
	const pathname = usePathname();
	const dialogRef = useRef<ComponentRef<typeof DialogTrigger> | null>(null);

	const createQueryString = useCreateQueryString(searchParams);
	const router = useRouter();

	const isDesktop = useMediaQuery('(min-width: 768px)');

	const queryClient = useQueryClient()

	const handleOpenChange = async (value: boolean) => {

		setOpen(value);
		if (value) {
			router.push(pathname + '?' + createQueryString('open', id.toString()));
		} else {
			await queryClient.invalidateQueries({ queryKey: [queryKey] })
			router.push(pathname);
		}
	};

	if (isDesktop) {
		return (
			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogTrigger className="w-full">{children}</DialogTrigger>
				<DialogContent className="md:min-w-[760px] lg:min-w-[1000px] w-full max-h-[90dvh] h-full overflow-y-auto">
					<VisuallyHidden.Root>
						<DialogTitle>Menu</DialogTitle>
					</VisuallyHidden.Root>
					{modalContent}
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer open={open} onOpenChange={handleOpenChange}>
			<DrawerTrigger className="w-full">{children}</DrawerTrigger>
			<DrawerContent className="max-h-[90dvh] h-full">
				<VisuallyHidden.Root>
					<DialogTitle>Menu</DialogTitle>
				</VisuallyHidden.Root>
				{modalContent}
			</DrawerContent>
		</Drawer>
	);
}
