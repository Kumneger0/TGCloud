import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Metadata } from 'next';
import Link from 'next/link';

const Markdown = dynamic(() => import('markdown-to-jsx'));
export const generateMetadata = async ({ params }: { params: { 'change-log': string } }): Promise<Metadata> => {
    const { 'change-log': changeLog } = params;
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
    const ogText = `🚀 TGCloud ${changeLog} Updates`;
    return {
        title: `Changelog - ${title}`,
        description,
        openGraph: {
            images: [
                {
                    url: `/api/og?text=${encodeURIComponent(ogText)}`,
                    width: 1200,
                    height: 630,
                    alt: ogText,
                },
            ],
        },
    };
};

export async function generateStaticParams() {
    const changelogDir = path.join(process.cwd(), 'src/app/(---)/changelog');
    const changelogFiles = fs.readdirSync(changelogDir).filter((file) => file.endsWith('.mdx'));
    return changelogFiles.map((file) => ({ 'change-log': file.replace('.mdx', '') }));
}

export default async function ChangelogDetailPage({ params }: { params: { 'change-log': string } }) {
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