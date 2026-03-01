'use client';
import {
	BotTokenExpiredModalContent,
	ChannelAccessDeniedModalContent,
	ConnectionErrorModalContent,
	ReLoginModalContent
} from '@/components/fileConnectionErrorModals';
import { telegramErrorMessagesThatNeedReLogin } from '@/lib/utils';
import { useGlobalModal } from '@/store/global-modal';
import { useGlobalStore } from '@/store/global-store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';


export function useErrorHandler() {
	const { openModal, closeModal } = useGlobalModal();
	const user = useGlobalStore((s) => s.user)
	const router = useRouter();
	const [isReconnecting, setIsReconnecting] = useState(false);

	function handleError(
		err: unknown,
		options?: {
			onReconnect?: () => Promise<void> | void;
		}
	) {

		if (!user) {
			return "User not found";
		}
		const authType = user.authType;
		const message = err instanceof Error ? err.message : String(err);
		const needsReLogin = telegramErrorMessagesThatNeedReLogin.some((code) =>
			message.includes(code)
		);

		if (needsReLogin && authType === 'user') {
			closeModal(true)
			openModal({
				forceDialog: true,
				content: (
					<ReLoginModalContent
						isUserLoading={isReconnecting}
						closeModal={closeModal}
						onReconnect={async () => {
							setIsReconnecting(true);
							try {
								await options?.onReconnect?.();
							} finally {
								setIsReconnecting(false);
							}
						}}
					/>
				)
			});
			return "You need to login with this telegram account again. we can't do anything telegram is the one forcing us to do this. "
		}

		if (
			message.includes('CHANNEL_INVALID') ||
			message.includes('CHANNEL_PRIVATE') ||
			message.includes('CHAT_WRITE_FORBIDDEN') ||
			message.includes('CHAT_ADMIN_REQUIRED')
		) {
			closeModal(true)
			openModal({
				forceDialog: true,
				content: (
					<ChannelAccessDeniedModalContent
						authType={authType}
						closeModal={closeModal}
						onReconnect={() => router.push('/connect-telegram')}
					/>
				)
			});
			return authType === 'bot'
				? "We couldn't access your Telegram channel. Did you remove the bot from the channel or revoke its admin permissions?"
				: "We couldn't access your Telegram channel. Did you delete the channel or leave it?"
		}

		if (message.includes('MSGID_DECREASE_RETRY') || message.includes('SERVER_ERROR')) {
			closeModal(true)
			openModal({
				forceDialog: true,
				content: <ConnectionErrorModalContent message={message} />
			});
			return "We encountered an issue while connecting to Telegram servers. This is usually temporary, try refreshing the page."
		}

		if (message.includes('ACCESS_TOKEN_EXPIRED')) {
			closeModal(true)
			openModal({
				forceDialog: true,
				content: <BotTokenExpiredModalContent />
			});
			return "We encountered an issue while connecting to Telegram servers. This is usually temporary, try refreshing the page."
		}

		toast.error("Something went wrong. Please try again later.");
	}

	return { handleError, isReconnecting };
}


