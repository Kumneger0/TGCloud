import fs from 'fs';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import path from 'path';

import Markdown from 'markdown-to-jsx';

type ChangelogDetailPageProps = {
	params: Promise<{ 'change-log': string }>;
};
export const generateMetadata = async ({ params }: ChangelogDetailPageProps): Promise<Metadata> => {
	const { 'change-log': changeLog } = await params;
	const filePath = path.join(process.cwd(), 'src/app/(---)/changelog', `${changeLog}.mdx`);
	let content = '';
	let title = `Changelog - ${changeLog}`;
	let description = 'View the changelog for the latest updates and improvements.';
	try {
		content = fs.readFileSync(filePath, 'utf-8');
		const firstLine = content.split('\n')[0];
		title = firstLine.replace('# ', '');
		description = content.split('\n').slice(1).join('\n');
	} catch (e) {
		//
	}
	const ogText = `TGCloud ${changeLog} Updates`;
	return {
		title: `Changelog - ${title}`,
		description,
		openGraph: {
			title: `Changelog - ${title}`,
			description,
			images: [
				{
					url: `/api/og?text=${encodeURIComponent(ogText)}`,
					width: 1200,
					height: 630,
					alt: ogText
				}
			]
		},
		twitter: {
			title: `Changelog - ${title}`,
			description,
			images: [
				{
					url: `/api/og?text=${encodeURIComponent(ogText)}`,
					width: 1200,
					height: 630,
					alt: ogText
				}
			]
		}
	};
};

export async function generateStaticParams() {
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
				console.error(`Failed to read changelog file ${filePath}:`, err);
			}
			return { date, title };
		});
	} catch (e) {
		logs = [];
	}

	return logs.map((log) => ({ 'change-log': log.date }));
}

export default async function ChangelogDetailPage({ params }: ChangelogDetailPageProps) {
	const { 'change-log': changeLog } = await params;
	const filePath = path.join(process.cwd(), 'src/app/(---)/changelog', `${changeLog}.mdx`);
	let content = '';
	try {
		content = fs.readFileSync(filePath, 'utf-8');
	} catch (e) {
		notFound();
	}

	return (
		<div className="min-h-screen flex flex-col w-full">
			<main className="flex-1 max-w-2xl mx-auto py-10 px-4 w-full">
				<Link href="/changelog">
					<button className="mb-8 px-4 py-2 rounded-lg bg-black text-white font-semibold shadow hover:bg-gray-800 transition-colors">
						← Back to Changelog
					</button>
				</Link>
				<div className="prose dark:prose-invert">
					<Markdown>{content}</Markdown>
				</div>
			</main>
		</div>
	);
}
