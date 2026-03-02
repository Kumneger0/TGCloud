'use client';
import { addToken, clearFilesAndChannelDetails, removeBotTokens, saveTelegramCredentials } from '@/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getTgClient } from '@/lib/getTgClient';
import { useGlobalModal } from '@/store/global-modal';
import { useGlobalStore } from '@/store/global-store';
import { toast } from 'sonner';
import { ErrorState } from './ErrorState';
import { useState } from 'react';
import { ExternalLink, Bot, ShieldAlert, MessageCircle } from 'lucide-react';

interface ChannelAccessDeniedModalContentProps {
	authType: 'bot' | 'user';
	closeModal: () => void;
	onReconnect: () => void;
}

export function ChannelAccessDeniedModalContent({
	authType,
	closeModal,
	onReconnect
}: ChannelAccessDeniedModalContentProps) {
	const me = useGlobalStore((s) => s.userTgInfo);
	return (
		<ErrorState
			title="Channel Access Denied"
			description={
				authType === 'bot'
					? "We couldn't access your Telegram channel. Did you remove the bot from the channel?"
					: "We couldn't access your Telegram channel. Did you delete the channel or leave it?"
			}
			warning={
				<p>
					If you proceed to reconnect, your current channel information will be deleted. <strong>You will lose access to all files stored in this channel through TGCloud.</strong>
				</p>
			}
			actionButton={{
				label: 'Delete Detail & Connect New Channel',
				variant: 'destructive',
				onClick: async () => {
					const result = await clearFilesAndChannelDetails();
					if (result) {
						closeModal();
						onReconnect();
					}
				}
			}}
			secondaryAction={{
				label: 'Go to Home',
				variant: 'outline',
				onClick: async () => {
					closeModal();
					window.location.href = '/';
				}
			}}
		>
			{me && (
				<div className="flex flex-col items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border">
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
						Logged in as
					</p>
					<div className="flex flex-col items-center">
						<div className="flex items-center gap-2">
							<span className="text-sm font-semibold">
								{me.firstName} {me.lastName}
							</span>
							<span
								className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tight ${authType === 'bot'
									? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
									: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
									}`}
							>
								{authType}
							</span>
						</div>
						{me.username && (
							<a
								href={`https://t.me/${me.username}`}
								target="_blank"
								rel="noopener noreferrer"
								className="text-xs text-primary hover:underline"
							>
								@{me.username}
							</a>
						)}
					</div>
				</div>
			)}
		</ErrorState>
	);
}

interface ReLoginModalContentProps {
	closeModal: () => void;
	onReconnect?: () => Promise<void> | void;
}

export function ReLoginModalContent({
	closeModal,
	onReconnect
}: ReLoginModalContentProps) {
	const [isUserLoading, setIsUserLoading] = useState(false);

	return (
		<ErrorState
			title="Telegram is forcing us to login again"
			description="You need to login with this telegram account again."
			actionButton={{
				label: isUserLoading ? 'Connecting...' : 'Reconnect Account',
				disabled: isUserLoading,
				className: 'w-full',
				onClick: async () => {
					setIsUserLoading(true);
					try {
						await onReconnect?.();
					} finally {
						setIsUserLoading(false);
					}
					closeModal();
				}
			}}
		/>
	);
}

interface ConnectionErrorModalContentProps {
	message: string;
}

export function ConnectionErrorModalContent({ message }: ConnectionErrorModalContentProps) {
	return (
		<ErrorState
			title="Telegram Connection Error"
			description="We encountered an issue while connecting to Telegram servers. This is usually temporary."
			warning={message}
			actionButton={{
				label: 'Reload Page',
				onClick: async () => {
					window.location.reload();
				}
			}}
		/>
	);
}


export function BotTokenExpiredModalContent() {
	return (
		<ErrorState
			title="Bot Token Expired"
			description="Your bot token has expired. Please update your bot token to continue using the service."
			actionButton={{
				label: 'Remove Bot Tokens',
				onClick: async () => {
					const result = await removeBotTokens();
					toast[result.success ? 'success' : 'error'](result.message);
					if (result.success) {
						window.location.href = '/connect-telegram';
					}
				}
			}}
		/>
	);
}

export function MissingBotTokenModalContent() {
	const user = useGlobalStore((s) => s.user);
	const setBotRateLimit = useGlobalStore((state) => state.setBotRateLimit);
	const closeModal = useGlobalModal((state) => state.closeModal);
	const [botToken, setBotToken] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const handleAddBot = async () => {
		if (!botToken) {
			toast.error('Please enter a bot token');
			return;
		}

		setIsLoading(true);
		try {
			if (!user || !user.id) {
				toast.error('Something went wrong, please try again later');
				return;
			}

			const getTgClientArgs: Parameters<typeof getTgClient>[0] = {
				authType: 'bot',
				botToken,
				setBotRateLimit
			};

			const client = await getTgClient(getTgClientArgs);
			if (!client) {
				toast.error('Invalid bot token');
				return;
			}

			if (!client.connected) await client.connect();

			if (!user.channelId || !user.accessHash) {
				toast.error('Something went wrong, please try again later');
				return;
			}

			const channelId = user.channelId.startsWith('-100')
				? user.channelId
				: `-100${user.channelId}`;

			const entity = await client.getInputEntity(channelId);
			const testMessage = await client?.sendMessage(entity, {
				message: 'Successfully updated bot token'
			});

			if (testMessage.id) {
				void client.deleteMessages(entity, [testMessage.id], { revoke: true });
				toast.success('Successfully updated bot token');
				await addToken(botToken);

				const id = (entity as unknown as { channelId: string })?.channelId;
				const result = await saveTelegramCredentials({
					accessHash: user.accessHash,
					channelId: String(id),
					channelTitle: user.channelTitle ?? ' ',
					authType: 'bot'
				});

				if (result.success) {
					closeModal();
					window.location.reload();
				} else if (result.message) {
					toast.error(result.message);
				}
			}
		} catch (err) {
			let userFriendlyMessage = 'Failed to add bot token. Ensure the bot is an admin in the channel.';
			if (err instanceof Error) {
				if (err.message.includes("ACCESS_TOKEN_INVALID")) {
					userFriendlyMessage = 'Invalid bot token. Ensure you copied the token correctly.';
				}
				if (
					err.message.includes('CHANNEL_INVALID') ||
					err.message.includes('CHANNEL_PRIVATE') ||
					err.message.includes('CHAT_WRITE_FORBIDDEN') ||
					err.message.includes('CHAT_ADMIN_REQUIRED')
				) {
					userFriendlyMessage = 'Failed to add bot token. Ensure the bot is an admin in the channel.';
				}
			}
			console.error(err);
			toast.error(userFriendlyMessage);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<ErrorState
			title="Bot Token Required"
			description="You don't have any bot tokens configured. To continue, you must create a bot and add its token."
			warning={
				<div className="space-y-4 text-left">
					<div className="bg-muted/50 p-3 rounded-md border border-border/50">
						<h4 className="flex items-center gap-2 font-semibold text-sm mb-2">
							<Bot className="h-4 w-4 text-primary" />
							How to create a bot:
						</h4>
						<ul className="text-xs space-y-2 list-decimal ml-4 text-muted-foreground">
							<li>
								Open <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">@BotFather <ExternalLink className="h-2 w-2" /></a>
							</li>
							<li>Send <code className="bg-secondary px-1 rounded">/newbot</code> and follow instructions.</li>
							<li>Copy the <strong>Token</strong> provided.</li>
							<li>Ensure your Telegram channel <strong>exists and is not deleted</strong>.</li>
							<li className="text-foreground font-medium flex items-start gap-1">
								<ShieldAlert className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
								<span><strong>CRITICAL:</strong> Add the bot to your channel as an <strong>Admin</strong>.</span>
							</li>
						</ul>
					</div>

					{user?.channelId && (
						<div className="flex flex-col gap-2">
							<p className="text-xs font-medium text-muted-foreground">Your Channel:</p>
							<a
								href={`https://t.me/${user.channelId.startsWith('-100') ? user.channelId.slice(4) : user.channelId}/1`}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors group"
							>
								<MessageCircle className="h-4 w-4 text-primary" />
								<span className="text-sm font-medium flex-1">{user.channelTitle || 'Your Channel'}</span>
								<ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
							</a>
						</div>
					)}

					<div className="space-y-3">
						<div className="space-y-1.5">
							<label htmlFor="modalBotToken" className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
								Enter Bot Token:
							</label>
							<div className="flex gap-2">
								<Input
									id="modalBotToken"
									type="text"
									placeholder="123456:ABC-DEF..."
									className="flex-1 font-mono text-xs"
									value={botToken}
									onChange={(e) => setBotToken(e.target.value)}
								/>
								<Button
									size="sm"
									onClick={handleAddBot}
									disabled={isLoading}
								>
									{isLoading ? 'Wait...' : 'Add Bot'}
								</Button>
							</div>
						</div>
					</div>


				</div>
			}
		/>
	);
}
