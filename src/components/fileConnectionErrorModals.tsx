'use client';
import { clearFilesAndChannelDetails } from '@/actions';
import { ErrorState } from './ErrorState';

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
	return (
		<ErrorState
			title="Channel Access Denied"
			description={
				authType === 'bot'
					? "We couldn't access your Telegram channel. Did you remove the bot from the channel or revoke its admin permissions?"
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
		/>
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
