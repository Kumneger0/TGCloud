'use client';
import Message from '@/lib/types';
import { getMessage } from '@/lib/utils';
import { streamMedia } from '@/lib/video-stream';
import { useGlobalStore } from '@/store/global-store';
import { useEffect, useRef } from 'react';


export default function GlobalAudioPlayer() {
    const audioRef = useRef<HTMLAudioElement>(null);
    const blobURLRef = useRef<string | null>(null);

    const setAudioRef = useGlobalStore((s) => s.setAudioRef);
    const audioPlayer = useGlobalStore((s) => s.audioPlayer);
    const updateAudioPlayer = useGlobalStore((s) => s.updateAudioPlayer);
    const user = useGlobalStore((s) => s.user);
    const client = useGlobalStore(s => s.client);
    const abortController = useGlobalStore(s => s.abortController);
    const setAbortController = useGlobalStore(s => s.setAbortController);

    useEffect(() => {
        setAudioRef(audioRef);
    }, [setAudioRef]);

    useEffect(() => {
        const fileId = audioPlayer?.fileTelegramId;
        const currentFileId = audioRef.current?.id;

        if (!fileId || (currentFileId && fileId === currentFileId)) {
            return
        }
        if (!user) return;

        if (blobURLRef.current) {
            URL.revokeObjectURL(blobURLRef.current);
            blobURLRef.current = null;
        }

        if (audioRef.current) {
            audioRef.current.id = fileId;
        }

        const startStream = async () => {
            try {
                if (!client) {
                    return;
                };
                if (!client.connected) {
                    await client.connect();
                }
                updateAudioPlayer({ isLoading: true })
                const message = await getMessage({
                    client: client,
                    messageId: fileId,
                    user: user,
                });
                if (!message) throw new Error('Message not found');
                console.log('message', message)

                const duration = (message as any)?.document?.attributes?.find(
                    (a: any) => a.className === 'DocumentAttributeAudio'
                )?.duration as number

                const mediaSource = new MediaSource();
                const url = URL.createObjectURL(mediaSource);
                blobURLRef.current = url;

                if (audioRef.current) {
                    audioRef.current.src = url;
                    audioRef.current.load();
                    audioRef.current.onwaiting = () => {
                        updateAudioPlayer({ isLoading: true })
                    }
                    audioRef.current.onplaying = () => {
                        updateAudioPlayer({ isLoading: false })
                    }
                }
                updateAudioPlayer({ blobURL: url, duration: duration ?? 0 });
                abortController?.abort()
                const newAbortController = new AbortController();
                setAbortController(newAbortController);
                void streamMedia({
                    client: client,
                    media: message as Message['media'],
                    mimeType: audioPlayer?.fileData?.mimeType || '',
                    mediaSource,
                    signal: newAbortController.signal
                }, (err) => {
                    updateAudioPlayer({ error: err })
                });
            } catch (err) {
                console.error('[GlobalAudioPlayer] stream error:', err);
                updateAudioPlayer({ error: err })
            }
        };

        startStream();
    }, [audioPlayer?.fileTelegramId, user?.id]);

    const handleLoadedMetadata = () => {
        audioRef.current?.play().catch(() => { });
    };

    const handleEnded = () => {
        if (audioRef.current) audioRef.current.currentTime = 0;
    };

    return (
        <audio
            ref={audioRef}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            style={{ display: 'none' }}
        />
    );
}
