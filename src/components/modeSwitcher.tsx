'use client'
import { getUser, saveTelegramCredentials, switchOperationMode } from '@/actions';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { getTgClient } from '@/lib/getTgClient';
import { loginInTelegram } from '@/lib/utils';
import { useGlobalStore } from '@/store/global-store';
import { Bot, Loader2, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

interface ModeSwitcherProps {
    authType: 'bot' | 'user';
    hasBotTokens: boolean;
    telegramSession: string | null;
    user: NonNullable<Awaited<ReturnType<typeof getUser>>> & {
        telegramSession: string | undefined;
    }
}

export function ModeSwitcher({ authType, hasBotTokens, telegramSession, user }: ModeSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [botToken, setBotToken] = useState('');
    const setBotRateLimit = useGlobalStore((state) => state.setBotRateLimit);
    const targetMode = authType === 'bot' ? 'user' : 'bot';
    const requiresBotToken = !hasBotTokens && targetMode === 'bot'

    const handleSwitch = async () => {
        if (!user.channelId) {
            toast.error('No storage channel connected');
            return;
        }

        if (requiresBotToken && !botToken) {
            toast.error('Please enter bot token');
            return;
        }

        setIsVerifying(true);
        try {
            const client = await getTgClient(
                targetMode === 'user'
                    ? { authType: 'user', stringSession: telegramSession || '' }
                    : {
                        authType: 'bot',
                        botToken: !hasBotTokens ? botToken : undefined,
                        setBotRateLimit
                    }
            );

            if (!client) {
                throw new Error(`Failed to initialize ${targetMode} client`);
            }

            if (targetMode === 'user' && !user.telegramSession) {
                const session = await loginInTelegram(client);
                if (!session) {
                    setIsVerifying(false);
                    return;
                }
            }
            const channelId = user?.channelId!.startsWith('-100')
                ? user?.channelId!
                : `-100${user?.channelId!}`;
            if (!client.connected) await client.connect()
            const entity = await client.getInputEntity(channelId);

            const testMessage = await client.sendMessage(entity, {
                message: `Verification: Switching to ${targetMode} mode...`
            });

            if (testMessage.id) {
                void client.deleteMessages(entity, [testMessage.id], { revoke: true }).catch(console.error);

                if (targetMode === 'bot' && !hasBotTokens && botToken) {
                    await saveTelegramCredentials({
                        channelId: channelId,
                        accessHash: user.accessHash ?? "",
                        channelTitle: '',
                        botToken: botToken,
                        authType: 'bot'
                    });
                }

                if (targetMode === 'user' && !user.telegramSession) {
                    const session = client.session.save() as unknown as string;
                    await saveTelegramCredentials({
                        session,
                        channelId: channelId,
                        accessHash: user.accessHash || '',
                        channelTitle: '',
                        authType: 'user'
                    });
                }

                const result = await switchOperationMode(targetMode);
                if (result.success) {
                    toast.success(`Switched to ${targetMode} mode`);
                    setIsOpen(false);
                    window.location.reload();
                }
            }
        } catch (error) {
            console.error('Mode switch verification failed:', error);
            const errorMessage = error instanceof Error ? error?.message : '';

            if (errorMessage.includes('CHAT_WRITE_FORBIDDEN') || errorMessage.includes('CHAT_ADMIN_REQUIRED')) {
                toast.error(`Verification failed: ${targetMode === 'bot' ? 'Bot' : 'Account'} is not an admin in the channel.`);
            } else {
                toast.error(`Verification failed: Could not access channel in ${targetMode} mode.`);
            }
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <button className="flex items-center w-full text-left rounded-lg px-3 py-2 hover:bg-muted transition-colors">
                    {authType === 'bot' ? (
                        <>
                            <UserIcon className="mr-2 h-4 w-4" />
                            <span className="flex-1 font-medium">Switch to User Mode</span>
                        </>
                    ) : (
                        <>
                            <Bot className="mr-2 h-4 w-4" />
                            <span className="flex-1 font-medium">Switch to Bot Mode</span>
                        </>
                    )}
                </button>
            </AlertDialogTrigger>

            <AlertDialogContent className="sm:max-w-md rounded-2xl">
                <AlertDialogHeader className="space-y-4">

                    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted">
                        {targetMode === 'bot' ? (
                            <Bot className="h-6 w-6 text-primary" />
                        ) : (
                            <UserIcon className="h-6 w-6 text-primary" />
                        )}
                        <div>
                            <h3 className="font-semibold text-lg">
                                Switch to {targetMode === 'bot' ? 'Bot' : 'User'} Mode
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                We’ll verify access before switching.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                        <p>
                            Your {targetMode === 'bot' ? 'bot' : 'Telegram account'} must be an
                            <span className="font-medium text-foreground"> admin </span>
                            in your storage channel.
                        </p>

                        <div className="p-3 rounded-lg bg-muted/50 border text-xs">
                            We send a temporary verification message and delete it instantly.
                            Nothing stays in your channel.
                        </div>

                        {targetMode === 'bot' && (
                            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                                <span className="font-semibold block mb-1">Session Clearing</span>
                                Switching to Bot Mode will clear your current Telegram session. You will need to reconnect your Telegram account to switch back to User Mode.
                            </div>
                        )}
                    </div>

                    {targetMode === 'bot' && !hasBotTokens && (
                        <div className="space-y-3 pt-2">
                            <Label htmlFor="botToken" className="text-sm font-medium">
                                Bot Token
                            </Label>

                            <Input
                                id="botToken"
                                placeholder="123456:ABC-DEF..."
                                value={botToken}
                                required
                                onChange={(e) => setBotToken(e.target.value)}
                                disabled={isVerifying}
                                className="font-mono text-sm"
                            />

                            <p className="text-xs text-muted-foreground">
                                Create one via{" "}
                                <a
                                    href="https://t.me/BotFather"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    @BotFather
                                </a>{" "}
                                and add it as channel admin.
                            </p>
                        </div>
                    )}
                </AlertDialogHeader>

                <AlertDialogFooter className="mt-4">
                    <AlertDialogCancel
                        disabled={isVerifying}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                        }}
                        className="rounded-lg"
                    >
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        disabled={isVerifying}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSwitch();
                        }}
                        className="rounded-lg"
                    >
                        {isVerifying ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            `Verify & Switch`
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
