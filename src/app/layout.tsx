import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '../../patch-global-alert-polyfill';

import { ThemeProvider } from '@/components/theme-provider';
import { env } from '@/env';
import { ClerkProvider } from '@clerk/nextjs';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
	title: 'Create Next App',
	description: 'Generated by create next app'
};

import { Toaster } from 'react-hot-toast';

import Providers, { SortByContext, SortByContextWrapper } from '@/lib/context';

export default async function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={inter.className}>
				<script></script>
				<Providers>
					<ClerkProvider
						afterSignOutUrl={'/login'}
						publishableKey={env.NEXT_PUBLIC_PUBLISHABLE_KEY}
						signUpForceRedirectUrl={'/connect-telegram'}
						signInForceRedirectUrl={'/connect-telegram'}
					>
						<ThemeProvider
							attribute="class"
							defaultTheme="system"
							enableSystem
							disableTransitionOnChange
						>
							<SortByContextWrapper>{children}</SortByContextWrapper>
						</ThemeProvider>
					</ClerkProvider>
				</Providers>
				<Toaster />
			</body>
		</html>
	);
}
