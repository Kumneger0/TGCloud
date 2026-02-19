import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Changelog',
	description: 'View the changelog for the latest updates and improvements.',
	openGraph: {
		images: [
			{
				url: `/api/og?text=${encodeURIComponent('🚀 TGCloud Changelog Updates')}`,
				width: 1200,
				height: 630,
				alt: '🚀 TGCloud Changelog Updates'
			}
		]
	}
};

export default function ChangelogIndexPage() {
	const changelogDir = path.join(process.cwd(), 'src/app/(---)/changelog');
	let logs: { date: string; title: string }[] = [];

	try {
		const files = fs
			.readdirSync(changelogDir)
			.filter((file) => file.endsWith('.mdx'))
			.sort((a, b) => b.localeCompare(a));

		logs = files.map((file) => {
			const date = file.replace('.mdx', '');
			const filePath = path.join(changelogDir, file);
			let title = date;
			try {
				const content = fs.readFileSync(filePath, 'utf-8');
				const firstLine = content.split('\n')[0];
				if (firstLine.startsWith('# ')) {
					title = firstLine
						.replace('# ', '')
						.replace(/Changelog\s*[–-]\s*/i, '')
						.trim();
				}
			} catch (err) {
				// fallback to date
			}
			return { date, title };
		});
	} catch (e) {
		logs = [];
	}

	return (
		<div className="min-h-screen flex flex-col w-full bg-white dark:bg-black">
			<main className="flex-1 max-w-3xl mx-auto py-16 px-6 w-full">
				<header className="mb-12">
					<Link
						href="/"
						className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors mb-4"
					>
						← Back home
					</Link>
					<h1 className="text-4xl font-extrabold tracking-tight text-black dark:text-white sm:text-5xl">
						Changelog
					</h1>
					<p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
						Stay up to date with the latest features, improvements, and fixes in TGCloud.
					</p>
				</header>

				<div className="space-y-6">
					{logs.length === 0 && (
						<div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
							<p className="text-gray-500">No changelogs found yet.</p>
						</div>
					)}
					{logs.map((log, index) => (
						<Link
							key={log.date}
							href={`/changelog/${log.date}`}
							className="group block p-6 bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 rounded-2xl hover:border-black dark:hover:border-white transition-all duration-300 hover:shadow-xl hover:scale-[1.01]"
						>
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
								<div className="space-y-1">
									<div className="flex items-center gap-2">
										<div className="text-sm font-medium text-gray-500 dark:text-gray-500">
											{new Date(log.date).toLocaleDateString('en-US', {
												month: 'long',
												day: 'numeric',
												year: 'numeric'
											})}
										</div>
										{index === 0 && (
											<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-black dark:bg-white text-white dark:text-black">
												Latest
											</span>
										)}
									</div>
									<h2 className="text-xl font-bold text-black dark:text-white group-hover:text-black dark:group-hover:text-white transition-colors">
										{log.title}
									</h2>
								</div>
								<div className="flex items-center text-sm font-semibold text-black dark:text-white">
									View details
									<svg
										className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 5l7 7-7 7"
										/>
									</svg>
								</div>
							</div>
						</Link>
					))}
				</div>
			</main>
		</div>
	);
}
