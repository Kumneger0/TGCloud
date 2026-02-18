'use client';
import { formatBytes } from '@/lib/utils';
import { useGlobalStore } from '@/store/global-store';
import { duration } from 'drizzle-orm/gel-core';
import { FileAudioIcon, Pause, Play as PlayIcon, X } from 'lucide-react';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';

const MiniAudioPlayer = React.memo(() => {
	const audioPlayer = useGlobalStore((s) => s.audioPlayer);
	const setAudioPlayer = useGlobalStore((s) => s.setAudioPlayer);
	const audioRef = useGlobalStore((s) => s.audioRef);

	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);

	useEffect(() => {
		const el = audioRef?.current;
		if (!el) return;

		const onPlay = () => setIsPlaying(true);
		const onPause = () => setIsPlaying(false);
		const onTimeUpdate = () => setCurrentTime(el.currentTime);

		const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };

		el.addEventListener('play', onPlay);
		el.addEventListener('pause', onPause);
		el.addEventListener('timeupdate', onTimeUpdate);
		el.addEventListener('ended', onEnded);

		setIsPlaying(!el.paused);
		setCurrentTime(el.currentTime);
		return () => {
			el.removeEventListener('play', onPlay);
			el.removeEventListener('pause', onPause);
			el.removeEventListener('timeupdate', onTimeUpdate);
			el.removeEventListener('ended', onEnded);
		};
	}, [audioRef, audioPlayer?.fileTelegramId]);

	if (!audioPlayer || !audioPlayer.isMinimized) return null;

	const { fileData } = audioPlayer;

	const handlePlayPause = () => {
		const el = audioRef?.current;
		if (!el) return;
		if (el.paused) {
			el.play().catch(() => { });
		} else {
			el.pause();
		}
	};

	const handleClose = () => {
		audioRef?.current?.pause();
		setAudioPlayer(null);
	};

	const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
		const el = audioRef?.current;
		if (!el) return;
		el.currentTime = Number(e.target.value);
		setCurrentTime(Number(e.target.value));
	};

	return (
		<div className="fixed bottom-4 right-4 z-50 bg-background border border-border rounded-lg shadow-lg flex items-center gap-4 p-4 w-[340px] max-w-[90vw]">
			<Image
				src="/audio-placeholder.svg"
				alt={fileData?.fileName ?? ''}
				width={48}
				height={48}
				className="rounded object-cover bg-muted flex-shrink-0"
			/>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 truncate">
					<FileAudioIcon className="w-4 h-4 text-primary flex-shrink-0" />
					<span className="truncate font-medium text-sm">{fileData?.fileName}</span>
				</div>
				<div className="flex justify-between text-xs text-muted-foreground mt-0.5">
					<span>{formatBytes(Number(fileData?.size))}</span>
					<span>
						{audioPlayer.duration
							? `${Math.floor(currentTime / 60)}:${('0' + Math.floor(currentTime % 60)).slice(-2)} / ${Math.floor(audioPlayer.duration / 60)}:${('0' + Math.floor(audioPlayer.duration % 60)).slice(-2)}`
							: '--:--'}
					</span>
				</div>
				<input
					type="range"
					min={0}
					max={audioPlayer.duration || 0}
					value={currentTime}
					onChange={handleSeek}
					className="w-full mt-1 accent-primary h-1"
				/>
			</div>
			<button
				onClick={handlePlayPause}
				className="rounded-full p-2 hover:bg-muted transition-colors flex-shrink-0"
				aria-label={isPlaying ? 'Pause' : 'Play'}
			>
				{isPlaying ? <Pause className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
			</button>
			<button
				onClick={handleClose}
				className="rounded-full p-2 hover:bg-muted transition-colors flex-shrink-0"
				aria-label="Close mini player"
			>
				<X className="w-5 h-5" />
			</button>
		</div>
	);
});

MiniAudioPlayer.displayName = 'MiniAudioPlayer';
export default MiniAudioPlayer;
