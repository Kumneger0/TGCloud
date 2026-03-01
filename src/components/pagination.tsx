'use client';
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious
} from '@/components/ui/pagination';
import { useCreateQueryString } from '@/lib/utils';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const ITEMS_PER_PAGE = 8;

const getPaginationRange = (currentPage: number, totalPages: number) => {
	const delta = 2;
	const range = [];
	const rangeWithEllipsis = [];
	let l;

	for (
		let i = Math.max(2, currentPage - delta);
		i <= Math.min(totalPages - 1, currentPage + delta);
		i++
	) {
		range.push(i);
	}

	if (currentPage - delta > 2) rangeWithEllipsis.push('...');

	for (let i of range) {
		rangeWithEllipsis.push(i);
	}

	if (currentPage + delta < totalPages - 1) {
		rangeWithEllipsis.push('...');
	}

	return [1, ...rangeWithEllipsis, totalPages];
};

function Paginate({ totalItems }: { totalItems: number }) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const page = parseInt(searchParams.get('page') || '1');
	const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
	const createQueryString = useCreateQueryString(searchParams);
	const pageNumbersToShow = [...new Set(getPaginationRange(page, totalPages))];
	const router = useRouter();

	const getURL = (page: number | string) => {
		if (page === '...') return '#';
		return pathname + '?' + createQueryString('page', page.toString());
	};

	return (
		<Pagination>
			<PaginationContent>
				<PaginationItem
					className={`${page === 1 ? 'cursor-not-allowed opacity-50' : ''} cursor-pointer`}
				>
					<PaginationPrevious
						onClick={() => router.push(page === totalPages ? '#' : getURL(page - 1))}
						aria-disabled={page === 1}
					/>
				</PaginationItem>
				{pageNumbersToShow.map((pageNumber, index) => {
					if (!pageNumber) return;
					return (
						<PaginationItem key={index}>
							{String(pageNumber) === '...' ? (
								<PaginationEllipsis />
							) : (
								<PaginationLink
									className="cursor-pointer"
										onClick={() => router.push(getURL(pageNumber))}
									isActive={pageNumber === page}
								>
									{pageNumber}
								</PaginationLink>
							)}
						</PaginationItem>
					);
				})}
				<PaginationItem
					className={`${
						page === totalPages || !pageNumbersToShow.includes(Number(page) + 1)
							? 'cursor-not-allowed opacity-50'
							: ''
					}
               cursor-pointer
          `}
				>
					<PaginationNext
						className="cursor-pointer"
						onClick={() => router.push(page === totalPages ? '#' : getURL(page + 1))}
						aria-disabled={page === totalPages}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}

export default Paginate;
