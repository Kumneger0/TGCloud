'use client';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import React, { Dispatch, SetStateAction, useState, useTransition } from 'react';
import { env } from '../env';
import { FileItem } from './types';
import { ProgressProvider } from '@bprogress/next/app';


if (typeof window !== 'undefined') {
	posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
		api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
		person_profiles: 'always'
	});
}

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
	return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

const Providers = ({ children }: { children: React.ReactNode }) => {
	return (
		<>
			<ProgressProvider
				height="4px"
				color="#fffd00"
				options={{ showSpinner: false }}
				shallowRouting
			>
				{children}
			</ProgressProvider>
		</>
	);
};

export default Providers;

type SortBy = 'name' | 'size' | 'type' | 'date';

interface UploadProgress {
	itemName: string;
	itemIndex: number;
	progress: number;
	total: number;
}

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

export const TGCloudGlobalContext = React.createContext<
	| {
		sortBy: SortBy;
		setSortBy: Dispatch<SetStateAction<SortBy>>;
		isSwitchingFolder: boolean;
		startPathSwitching: React.TransitionStartFunction;
		uploadProgress: UploadProgress | undefined;
		setUploadProgress: Dispatch<SetStateAction<UploadProgress | undefined>>;
		botRateLimit: {
			isRateLimited: boolean;
			retryAfter: number;
		};
		setBotRateLimit: React.Dispatch<
			React.SetStateAction<{
				isRateLimited: boolean;
				retryAfter: number;
			}>
		>;
		miniPlayerAudio: MiniPlayerAudio | null;
		setMiniPlayerAudio: Dispatch<SetStateAction<MiniPlayerAudio | null>>;
	}
	| undefined
>(undefined);

export const TGCloudGlobalContextWrapper = ({ children }: { children: React.ReactNode }) => {
	const [sortBy, setSortBy] = useState<SortBy>('name');
	const [isSwitchingFolder, startPathSwitching] = useTransition();
	const [uploadProgress, setUploadProgress] = useState<UploadProgress | undefined>(undefined);
	const [botRateLimit, setBotRateLimit] = useState<{
		isRateLimited: boolean;
		retryAfter: number;
	}>({
		isRateLimited: false,
		retryAfter: 0
	});
	const [miniPlayerAudio, setMiniPlayerAudio] = useState<MiniPlayerAudio | null>(null);

	return (
		<TGCloudGlobalContext.Provider
			value={{
				setSortBy,
				sortBy,
				isSwitchingFolder,
				startPathSwitching,
				botRateLimit,
				setBotRateLimit,
				setUploadProgress,
				uploadProgress,
				miniPlayerAudio,
				setMiniPlayerAudio,
			}}
		>
			{children}
		</TGCloudGlobalContext.Provider>
	);
};

export const getGlobalTGCloudContext = () => {
	// eslint-disable-next-line react-hooks/rules-of-hooks
	return React.use(TGCloudGlobalContext);
};
