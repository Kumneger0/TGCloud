'use client';
import { useGlobalStore } from '@/store/global-store';
import { useEffect, useState } from 'react';
import { Api } from 'telegram';

interface ChannelInfoProps {
    initialTitle: string;
    channelId: string;
    authType: 'bot' | 'user';
}

export function ChannelInfo({ initialTitle, channelId, authType }: ChannelInfoProps) {
    const client = useGlobalStore((s) => s.client);
    const channelTitle = useGlobalStore((s) => s.channelTitle);
    const setChannelTitle = useGlobalStore((s) => s.setChannelTitle);

    useEffect(() => {
        async function fetchChannelInfo() {
            if (!client || !channelId) return;
            if (channelTitle) return;
            try {
                const formattedId = channelId.startsWith('-100') ? channelId : `-100${channelId}`;
                const entity = await client.getEntity(formattedId);

                if (entity instanceof Api.Channel || entity instanceof Api.Chat) {
                    setChannelTitle(entity.title);
                }
            } catch (error) {
                console.error('Failed to fetch dynamic channel info:', error);
            }
        }

        fetchChannelInfo();
    }, [client, channelId, channelTitle]);

    return (
        <p className="text-xs font-medium text-foreground truncate max-w-[190px]">
            {channelTitle || initialTitle || 'No channel connected'}
        </p>
    );
}
