import { FileItem, User } from '@/lib/types';
import { RefObject } from 'react';
import { Api, TelegramClient } from 'telegram';
import { create } from 'zustand';

export interface UploadProgress {
	itemName: string;
	itemIndex: number;
	progress: number;
	total: number;
}

type SortBy = 'name' | 'size' | 'type' | 'date';

export interface AudioPlayerState {
	fileData: FileItem;
	error: unknown | null;
	fileTelegramId: string;
	isMinimized: boolean;
	duration: number;
	blobURL: string;
	isLoading: boolean;
}

type GlobalStoreType = {
	user: User & { telegramSession?: string } | null;
	userTgInfo: Api.User | null;
	setUser: (user: User & { telegramSession?: string }) => void;
	setUserTgInfo: (userTgInfo: Api.User) => void;
	sortBy: SortBy;
	setSortBy: (sortBy: SortBy) => void;
	client: TelegramClient | null;
	setClient: (client: TelegramClient | null) => void;
	isSwitchingFolder: boolean;
	setIsSwitchingFolder: (value: boolean) => void;
	uploadProgress: UploadProgress | undefined;
	setUploadProgress: (uploadProgress: UploadProgress | undefined) => void;
	canAccessChannel: boolean;
	setCanAccessChannel: (value: boolean) => void;
	botRateLimit: {
		isRateLimited: boolean;
		retryAfter: number;
	};
	setBotRateLimit: (botRateLimit: { isRateLimited: boolean; retryAfter: number }) => void;
	audioPlayer: AudioPlayerState | null;
	setAudioPlayer: (state: AudioPlayerState | null) => void;
	updateAudioPlayer: (partial: Partial<AudioPlayerState>) => void;

	audioRef: RefObject<HTMLAudioElement | null> | null;
	videoRef: RefObject<HTMLVideoElement | null> | null;
	abortController: AbortController | null;
	setAudioRef: (ref: RefObject<HTMLAudioElement | null>) => void;
	setVideoRef: (ref: RefObject<HTMLVideoElement | null>) => void;
	setAbortController: (abortController: AbortController | null) => void;
	channelTitle: string | null;
	setChannelTitle: (title: string | null) => void;
};

export const useGlobalStore = create<GlobalStoreType>((set, get) => ({
	user: null,
	userTgInfo: null,
	setUser: (user: User & { telegramSession?: string }) => set({ user }),
	setUserTgInfo: (userTgInfo: Api.User) => set({ userTgInfo }),
	client: null,
	setClient: (client: TelegramClient | null) => set({ client }),
	sortBy: 'name',
	setSortBy: (sortBy) => set({ sortBy }),
	isSwitchingFolder: false,
	setIsSwitchingFolder: (value) => set({ isSwitchingFolder: value }),
	uploadProgress: undefined,
	setUploadProgress: (uploadProgress) => set({ uploadProgress }),
	canAccessChannel: false,
	setCanAccessChannel: (value) => set({ canAccessChannel: value }),
	botRateLimit: { isRateLimited: false, retryAfter: 0 },
	setBotRateLimit: (botRateLimit) => set({ botRateLimit }),
	audioPlayer: null,
	setAudioPlayer: (state) => set({ audioPlayer: state }),
	updateAudioPlayer: (partial) => {
		const current = get().audioPlayer;
		if (!current) return;
		const next = { ...current, ...partial };
		set({ audioPlayer: next });
	},

	audioRef: null,
	videoRef: null,
	setAudioRef: (ref) => set({ audioRef: ref }),
	setVideoRef: (ref) => set({ videoRef: ref }),
	abortController: null,
	setAbortController: (abortController) => set({ abortController }),
	channelTitle: null,
	setChannelTitle: (channelTitle) => set({ channelTitle }),
}));
