'use client';
import { getUser, getUserTelegramSession } from '@/actions';
import { useGlobalStore } from '@/store/global-store';
import { ProgressProvider } from '@bprogress/next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { FileItem } from './types';

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
