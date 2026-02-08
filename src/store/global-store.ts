import { FileItem } from '@/lib/types';
import { create } from 'zustand';

export interface UploadProgress {
	itemName: string;
	itemIndex: number;
	progress: number;
	total: number;
}

type SortBy = 'name' | 'size' | 'type' | 'date';

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

type GlobalStoreType = {
	sortBy: SortBy;
	setSortBy: (sortBy: SortBy) => void;
	isSwitchingFolder: boolean;
	startPathSwitching: (value: boolean) => void;
	uploadProgress: UploadProgress | undefined;
	setUploadProgress: (uploadProgress: UploadProgress | undefined) => void;
	telegramSession: string | undefined;
	setTelegramSession: (telegramSession: string | undefined) => void;
	botRateLimit: {
		isRateLimited: boolean;
		retryAfter: number;
	};
	setBotRateLimit: (botRateLimit: { isRateLimited: boolean; retryAfter: number }) => void;
	miniPlayerAudio: MiniPlayerAudio | null;
	setMiniPlayerAudio: (miniPlayerAudio: MiniPlayerAudio | null) => void;
};

export const useGlobalStore = create<GlobalStoreType>((set) => ({
	sortBy: 'name',
	setSortBy: (sortBy: SortBy) => set({ sortBy }),
	isSwitchingFolder: false,
	startPathSwitching: (value: boolean) => set({ isSwitchingFolder: value }),
	uploadProgress: undefined,
	setUploadProgress: (uploadProgress: UploadProgress | undefined) => set({ uploadProgress }),
	telegramSession: undefined,
	setTelegramSession: (telegramSession: string | undefined) => set({ telegramSession }),
	botRateLimit: {
		isRateLimited: false,
		retryAfter: 0
	},
	setBotRateLimit: (botRateLimit: { isRateLimited: boolean; retryAfter: number }) =>
		set({ botRateLimit }),
	miniPlayerAudio: null,
	setMiniPlayerAudio: (miniPlayerAudio: MiniPlayerAudio | null) => set({ miniPlayerAudio })
}));
