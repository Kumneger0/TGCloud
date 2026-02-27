'use client';
import { clearFilesAndChannelDetails } from '@/actions';
import { ErrorState } from './ErrorState';
import { useGlobalStore } from '@/store/global-store';

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
	isUserLoading: boolean;
	closeModal: () => void;
	onReconnect: () => void;
}

export function ReLoginModalContent({
	isUserLoading,
	closeModal,
	onReconnect
}: ReLoginModalContentProps) {
	return (
		<ErrorState
			title="Telegram is forcing us to login again"
			description="You need to login with this telegram account again."
			actionButton={{
				label: isUserLoading ? 'Connecting...' : 'Reconnect Account',
				disabled: isUserLoading,
				className: 'w-full',
				onClick: async () => {
					closeModal();
					onReconnect();
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
