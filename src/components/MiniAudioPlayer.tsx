'use client'
import { getGlobalTGCloudContext } from '@/lib/context';
import { formatBytes } from '@/lib/utils';
import { FileAudioIcon, Pause, Play as PlayIcon, X } from 'lucide-react';
import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce'

const MiniAudioPlayer = React.memo(() => {
    const tGCloudGlobalContext = getGlobalTGCloudContext();
    const { miniPlayerAudio, setMiniPlayerAudio } = tGCloudGlobalContext ?? {};
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (!miniPlayerAudio) return;
        setIsPlaying(miniPlayerAudio.isPlaying);
        setProgress(miniPlayerAudio.progress);
        setDuration(miniPlayerAudio.duration);
        if (audioRef.current) {
            audioRef.current.currentTime = miniPlayerAudio.currentTime;
        }
    }, [miniPlayerAudio]);

    useEffect(() => {
        return () => {
            setMiniPlayerAudio && setMiniPlayerAudio(null);
            setProgress(0);
            setDuration(0);
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
            }
        };
    }, []);

    useEffect(() => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.play();
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying]);

    const handleTimeUpdate = useDebouncedCallback(() => {
        if (audioRef.current) {
            setProgress(audioRef.current.currentTime);
        }
    }, 2000);

    if (!miniPlayerAudio) return null;

    const { fileData, blobURL } = miniPlayerAudio;

    const handlePlayPause = () => {
        setIsPlaying((prev) => {
            setMiniPlayerAudio && setMiniPlayerAudio({ ...miniPlayerAudio, isPlaying: !prev });
            return !prev;
        });
    };

    const handleClose = () => {
        setMiniPlayerAudio && setMiniPlayerAudio(null);
    };



    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };


    console.log("progress", progress)

    if (!miniPlayerAudio.isMinimized) return null;
    return (
        <div className="fixed bottom-4 right-4 z-50 bg-background border border-border rounded-lg shadow-lg flex items-center gap-4 p-4 w-[340px] max-w-[90vw]">
            <Image
                src={'/audio-placeholder.svg'}
                alt={fileData?.fileName}
                width={48}
                height={48}
                className="rounded object-cover bg-muted"
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 truncate">
                    <FileAudioIcon className="w-5 h-5 text-primary" />
                    <span className="truncate font-medium text-sm">{fileData?.fileName}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{formatBytes(Number(fileData?.size))}</span>
                    <span className="text-xs text-muted-foreground">
                        {duration ? `${Math.floor(duration / 60)}:${('0' + Math.floor(duration % 60)).slice(-2)}` : '--:--'}
                    </span>
                </div>
                <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    value={progress}
                    onChange={e => {
                        if (audioRef.current) {
                            audioRef.current.currentTime = Number(e.target.value);
                            setProgress(Number(e.target.value));
                        }
                    }}
                    className="w-full mt-1 accent-primary"
                />
            </div>
            <button
                onClick={handlePlayPause}
                className="rounded-full p-2 hover:bg-muted transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
            >
                {isPlaying ? <Pause className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
            </button>
            <button
                onClick={handleClose}
                className="rounded-full p-2 hover:bg-muted transition-colors"
                aria-label="Close mini player"
            >
                <X className="w-5 h-5" />
            </button>
            <audio
                ref={audioRef}
                src={blobURL}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                style={{ display: 'none' }}
                autoPlay={isPlaying}
            />
        </div>
    );
})

MiniAudioPlayer.displayName = 'MiniAudioPlayer';

export default MiniAudioPlayer;