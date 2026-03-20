'use client';
import { getUser, getUserTelegramSession } from '@/actions';
import { useGlobalStore } from '@/store/global-store';
import { ProgressProvider } from '@bprogress/next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import React, { use, useEffect } from 'react';
import { env } from '../env';
import { FileItem } from './types';

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		if (typeof window !== 'undefined') {
			posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
				api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
				person_profiles: 'always',
			});
		}
	}, []);

	return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

const queryClient = new QueryClient();

const Providers = ({ children }: { children: React.ReactNode }) => {
	const setUser = useGlobalStore((s) => s.setUser);
	useEffect(() => {
		(async () => {
			const [user, stringSession] = await Promise.all([getUser(), getUserTelegramSession()]);
			if (!user) {
				return;
			}
			setUser({ ...user, telegramSession: stringSession });
		})();
	}, []);
	return (
		<>
			<QueryClientProvider client={queryClient}>
				<ProgressProvider
					height="4px"
					color="rgba(85, 61, 61, 1)"
					options={{ showSpinner: false }}
					shallowRouting
				>
					{children}
				</ProgressProvider>
			</QueryClientProvider>
		</>
	);
};

export default Providers;

export interface MiniPlayerAudio {
	fileData: FileItem;
	blobURL: string;
	isPlaying: boolean;
	progress: number;
	duration: number;
	currentTime: number;
	isMinimized: boolean;
	fileTelegramId: string;
}
