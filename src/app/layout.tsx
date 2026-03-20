import GlobalAudioPlayer from '@/components/GlobalAudioPlayer';
import { GlobalModal } from '@/components/GlobalModal';
import MiniAudioPlayer from '@/components/MiniAudioPlayer';
import RecentUpdate from '@/components/RecentUpdate';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import Providers from '@/lib/context';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../../patch-global-alert-polyfill';
import './globals.css';
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
	metadataBase: new URL('https://yourtgcloud.vercel.app/'),
	title: 'Unlimited Cloud Storage | TGCloud',

	description:
		'Enjoy unlimited cloud storage integrated with Telegram. Effortlessly store and manage your files with no limits.',
	keywords: 'unlimited cloud storage, Telegram integration, file management, cloud storage app',
	openGraph: {
		title: 'Unlimited Cloud Storage | TGCloud',
		description:
			'Enjoy unlimited cloud storage integrated with Telegram. Effortlessly store and manage your files with no limits.',
		images: [
			{
				url: '/TGCloud.webp',
				alt: 'Unlimited Cloud Storage',
				width: 1200,
				height: 630
			}
		]
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Unlimited Cloud Storage | Your Cloud App',
		description:
			'Enjoy unlimited cloud storage integrated with Telegram. Effortlessly store and manage your files with no limits.',
		images: [
			{
				url: '/TGCloud.webp'
			}
		]
	}
};

export default async function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link rel="icon" href="/favicon.ico" sizes="any" />
			</head>

			<body className={inter.className}>
				<Providers>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						disableTransitionOnChange
						enableColorScheme={false}
					>
						<RecentUpdate />
						{children}
						<GlobalAudioPlayer />
						<GlobalModal />
						<MiniAudioPlayer />
					</ThemeProvider>
				</Providers>
				<Toaster />
			</body>
		</html>
	);
}
