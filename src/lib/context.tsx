'use client';
import { ProgressProvider } from '@bprogress/next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import React, { useEffect } from 'react';
import { env } from '../env';
import { FileItem, User } from './types';
import { useGlobalStore } from '@/store/global-store';

if (typeof window !== 'undefined') {
	posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
		api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
		person_profiles: 'always'
	});
}

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
	return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

const queryClient = new QueryClient()


const Providers = ({ children, user }: { children: React.ReactNode, user: User | null }) => {
	const setUser = useGlobalStore((s) => s.setUser);
	useEffect(() => {
		setUser(user);
	}, [user]);
	return (
		<>
			<QueryClientProvider client={queryClient}>
				<ProgressProvider height="4px" color="#f00" options={{ showSpinner: false }} shallowRouting>
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
