'use client';

import { QUERY_KEYS, useCreateQueryString } from '@/lib/utils';
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
		queryKey: ReturnType<typeof QUERY_KEYS[keyof typeof QUERY_KEYS]>
	id: number;
}) {
	const searchParams = useSearchParams();
	const createQueryString = useCreateQueryString(searchParams);
	const pathname = usePathname();
	const router = useRouter();
	const queryClient = useQueryClient();
	const openModal = useGlobalModal(s => s.openModal);
	const audioRef = useGlobalStore(s => s.audioRef)
	const videoRef = useGlobalStore(s => s.videoRef)
	const abortController = useGlobalStore(s => s.abortController)
	const setAbortController = useGlobalStore(s => s.setAbortController)

	const handleOpen = () => {
		router.push(pathname + '?' + createQueryString('open', id.toString()));
		openModal({
			content: modalContent,
			closeMediaOnClose: queryKey.startsWith('audio') || queryKey.startsWith('video'),
			size: 'lg',
			onClose: async (closeMediaOnClose: boolean) => {
				await queryClient.invalidateQueries({ queryKey: [queryKey] });
				router.push(pathname);
				if (closeMediaOnClose) {
					abortController?.abort();
					videoRef?.current?.pause();
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
