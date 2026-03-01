import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../../patch-global-alert-polyfill';
import './globals.css';
import { Toaster } from "@/components/ui/sonner"
import GlobalAudioPlayer from '@/components/GlobalAudioPlayer';
import MiniAudioPlayer from '@/components/MiniAudioPlayer';
import RecentUpdate from '@/components/RecentUpdate';
import { ThemeProvider } from '@/components/theme-provider';
import Providers, { CSPostHogProvider } from '@/lib/context';
import { GlobalModal } from '@/components/GlobalModal';
import { getUser } from '@/actions';
import { USER_TELEGRAM_SESSION_COOKIE_NAME } from '@/lib/consts';
import { cookies } from 'next/headers';
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
	const user = await getUser();
	const cookieStore = await cookies();
	const stringSession = cookieStore.get(USER_TELEGRAM_SESSION_COOKIE_NAME)?.value;

	return (
		<html lang="en">
			<head>
				<link rel="icon" href="/favicon.ico" sizes="any" />
			</head>

			<CSPostHogProvider>
				<body className={inter.className}>
					<Providers user={user ? { ...user, telegramSession: stringSession } : null}>
						<ThemeProvider
							attribute="class"
							defaultTheme="system"
							enableSystem
							disableTransitionOnChange
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
			</CSPostHogProvider>
		</html>
	);
}
