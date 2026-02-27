'use client';
import { getUser, updateTokenRateLimit } from '@/actions';
import { env } from '@/env';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

export type GetTgClientOptions = GetTgClientUserTypeArgs | GetTgClientBotTypeArgs;

type GetTgClientUserTypeArgs = {
	authType: 'user';
	stringSession: string;
};

type GetTgClientBotTypeArgs = {
	authType: 'bot';
	botToken?: string;
	setBotRateLimit: (botRateLimit: { isRateLimited: boolean; retryAfter: number }) => void;
	shouldFilterDefaultBotToken?: boolean;
};

const getBotTokenWithLeastAmountOfRemaingRateLimit = async (
	user: Awaited<ReturnType<typeof getUser>>,
	shouldFilterDefaultBotToken: boolean
) => {
	const allTokens = user?.botTokens ?? [];

	const isThereAnyBotWithoutRateLimit = allTokens.some((token) => !token.rateLimitedUntil);
	if (isThereAnyBotWithoutRateLimit) {
		return allTokens.find((token) => !token.rateLimitedUntil)?.token;
	}
	const now = new Date().getTime() / 1000;
	const tokenWithLeastAmountOfRemainingRateLimit = (
		allTokens.filter((token) => token.rateLimitedUntil) as unknown as {
			rateLimitedUntil: Date;
			token: string;
			id: string;
		}[]
	).filter(({ token }) => shouldFilterDefaultBotToken ? token !== env.NEXT_PUBLIC_BOT_TOKEN : true).sort((a, b) => {
		const remainingA = a.rateLimitedUntil?.getTime() / 1000 - now;
		const remainingB = b.rateLimitedUntil?.getTime() / 1000 - now;
		return remainingA - remainingB;
	})[0];

	return tokenWithLeastAmountOfRemainingRateLimit?.token;
};


export async function getTgClient(options: GetTgClientOptions) {
	if (typeof window === 'undefined') return;
	const user = await getUser();
	if (!user) {
		console.error('error', "user is not logged in ")
		return
	}

	try {
		localStorage.removeItem('GramJs:apiCache');
		const client = new TelegramClient(
			new StringSession(options.authType === 'user' ? options.stringSession : ''),
			env.NEXT_PUBLIC_TELEGRAM_API_ID,
			env.NEXT_PUBLIC_TELEGRAM_API_HASH,
			{ connectionRetries: 5 }
		);

		if (options.authType === 'user') {
			return client;
		}

		const userBotToken = await getBotTokenWithLeastAmountOfRemaingRateLimit(user, !!options.shouldFilterDefaultBotToken);
		const token = options.botToken ?? userBotToken ?? env.NEXT_PUBLIC_BOT_TOKEN;

		try {
			await Promise.race([
				client.start({
					botAuthToken: token
				}),
				new Promise((resolve, reject) => setTimeout(() => reject(new Error('connection timeout')), 15000))
			]);
		} catch (startError: unknown) {
			console.error('startError', startError);
			const error = startError as { message?: string };
			if (error?.message?.includes('A wait of')) {
				const waitTimeMatch = error.message.match(/(\d+)\sseconds/);
				if (waitTimeMatch) {
					const waitTime = parseInt(waitTimeMatch[1]);
					const timeInMilliseconds = waitTime * 1000;
					options.setBotRateLimit?.({
						isRateLimited: true,
						retryAfter: waitTime
					});
					const tokenId = user?.botTokens?.find((token) => token.token === userBotToken)?.id;

					if (tokenId) {
						await updateTokenRateLimit(tokenId, timeInMilliseconds);
					}
				}
			} else {
				throw startError;
			}
		}

		return client;
	} catch (error) {
		console.error('Error initializing Telegram   client:', error);
		return undefined;
	}
}
