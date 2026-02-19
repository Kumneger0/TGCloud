'use client';

import { UPDATE_BANNER_DURATION_DAYS } from '@/lib/latestUpdate';
import Link from 'next/link';
import { useState } from 'react';

export default function UpdateBanner({
	recentUpdateDate
}: {
		recentUpdateDate: string;
}) {
	const [show, setShow] = useState(() => {
		if (typeof window === 'undefined' || localStorage.getItem('updateBannerDismissed')) return false;
		const now = new Date();
		const diffDays = now.getTime() - new Date(recentUpdateDate).getTime();
		const diffDaysNumber = diffDays / (1000 * 60 * 60 * 24);
		return diffDaysNumber < UPDATE_BANNER_DURATION_DAYS;
	});

	if (!show) return null;

	return (
		<div className="sticky top-0 left-0 right-0 z-[9999] bg-black dark:bg-white text-white dark:text-black py-3 px-4 shadow-lg">
			<div className="max-w-5xl mx-auto flex items-center justify-between">
				<div className="flex items-center space-x-3">
					<span className="text-xl">🎉</span>
					<span>New update available!</span>
					<Link
						href={`/changelog/${recentUpdateDate}`}
						onClick={() => {
							setShow(false);
							localStorage.setItem('updateBannerDismissed', 'true');
						}}
						className="font-medium hover:text-gray-300 dark:hover:text-gray-700 underline underline-offset-2 transition-colors"
					>
						Check out what&apos;s new
					</Link>
				</div>
				<button
					className="text-sm hover:text-gray-300 dark:hover:text-gray-700 transition-colors"
					onClick={() => {
						setShow(false);
						localStorage.setItem('updateBannerDismissed', 'true');
					}}
				>
					Dismiss
				</button>
			</div>
		</div>
	);
}
