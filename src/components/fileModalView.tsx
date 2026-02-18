'use client';

import { useCreateQueryString } from '@/lib/utils';
import { useGlobalModal } from '@/store/global-modal';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
	const createQueryString = useCreateQueryString(searchParams);
	const pathname = usePathname();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { openModal } = useGlobalModal();

	const handleOpen = () => {
		router.push(pathname + '?' + createQueryString('open', id.toString()));
		openModal({
			content: modalContent,
			size: 'lg',
			onClose: async () => {
				await queryClient.invalidateQueries({ queryKey: [queryKey] });
				router.push(pathname);
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
