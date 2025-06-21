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
	let changelogFiles: string[] = [];
	try {
		changelogFiles = fs
			.readdirSync(changelogDir)
			.filter((file) => file.endsWith('.mdx'))
			.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
	} catch (e) {
		changelogFiles = [];
	}

	return (
		<div className="min-h-screen flex flex-col w-full">
			<main className="flex-1 max-w-2xl mx-auto py-10 px-4 w-full">
				<h1 className="text-3xl font-bold mb-6">Changelog</h1>
				<ul className="space-y-4">
					{changelogFiles.length === 0 && <li>No changelogs found.</li>}
					{changelogFiles.map((file) => {
						const date = file.replace('.mdx', '');
						return (
							<li key={file}>
								<Link href={`/changelog/${date}`} className="text-blue-600 hover:underline">
									{date}
								</Link>
							</li>
						);
					})}
				</ul>
			</main>
		</div>
	);
}
