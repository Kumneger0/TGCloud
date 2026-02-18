'use client';
import { withTelegramConnection } from '@/lib/telegramMutex';
import Message from '@/lib/types';
import { getMessage } from '@/lib/utils';
import { streamMedia } from '@/lib/video-stream';
import { useGlobalStore } from '@/store/global-store';
import { useEffect, useRef } from 'react';


export default function GlobalAudioPlayer() {
    const audioRef = useRef<HTMLAudioElement>(null);
    const currentFileIdRef = useRef<string | null>(null);
    const blobURLRef = useRef<string | null>(null);

    const setAudioRef = useGlobalStore((s) => s.setAudioRef);
    const audioPlayer = useGlobalStore((s) => s.audioPlayer);
    const updateAudioPlayer = useGlobalStore((s) => s.updateAudioPlayer);
    const user = useGlobalStore((s) => s.user);
    const client = useGlobalStore(s => s.client)

    useEffect(() => {
        setAudioRef(audioRef);
    }, [setAudioRef]);

    useEffect(() => {
        const fileId = audioPlayer?.fileTelegramId;

        if (!fileId || fileId === currentFileIdRef.current) return;
        if (!user) return;

        currentFileIdRef.current = fileId;

        if (blobURLRef.current) {
            URL.revokeObjectURL(blobURLRef.current);
            blobURLRef.current = null;
        }

        const startStream = async () => {

            try {
                if (!client) return;
                if (!client.connected) await client.connect();
                updateAudioPlayer({ isLoading: true })
                const message = await withTelegramConnection(client, async (c) => {
                    const msg = await getMessage({
                        client: c,
                        messageId: fileId,
                        user: user,
                    });
                    if (!msg) throw new Error('Message not found');
                    return msg;
                });


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

                withTelegramConnection(client, async (c) => {
                    await streamMedia({
                        client: c,
                        media: message as Message['media'],
                        mimeType: audioPlayer!.fileData.mimeType,
                        mediaSource,
                    });
                });
            } catch (err) {
                console.error('[GlobalAudioPlayer] stream error:', err);
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
