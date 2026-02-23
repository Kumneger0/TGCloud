'use client';

import { useCreateQueryString } from '@/lib/utils';
import { useGlobalModal } from '@/store/global-modal';
import { useGlobalStore } from '@/store/global-store';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function FileModalView({
	children,
	modalContent,
	id,
	queryKey,
}: {
	children: React.ReactNode;
		modalContent: React.ReactNode;
		queryKey: string;
	id: number;
}) {
	const searchParams = useSearchParams();
	const createQueryString = useCreateQueryString(searchParams);
	const pathname = usePathname();
	const router = useRouter();
	const queryClient = useQueryClient();
	const openModal = useGlobalModal(s => s.openModal);
	const audioRef = useGlobalStore(s => s.audioRef)
	const abortController = useGlobalStore(s => s.abortController)
	const setAbortController = useGlobalStore(s => s.setAbortController)

	const handleOpen = () => {
		router.push(pathname + '?' + createQueryString('open', id.toString()));
		openModal({
			content: modalContent,
			size: 'lg',
			onClose: async (closeMediaOnClose: boolean) => {
				await queryClient.invalidateQueries({ queryKey: [queryKey] });
				router.push(pathname);
				if (closeMediaOnClose) {
					abortController?.abort();
					setAbortController(new AbortController());
					audioRef?.current?.pause();
				}
			}
		});
	};

	return (	
		<button
			type="button"
			className="w-full text-left"
			onClick={handleOpen}
		>
			{children}
		</button>
	);
}
