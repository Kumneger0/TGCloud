import { Mutex } from 'async-mutex';
import { TelegramClient } from 'telegram';

const telegramMutex = new Mutex();

export async function withTelegramConnection<T>(
	client: TelegramClient,
	operation: (client: TelegramClient) => Promise<T>,
): Promise<T | undefined> {
	if (!client) {
		throw new Error('Telegram client is not initialized');
	}

	const isConnected = client.connected ?? (await client.connect());
	if (!isConnected) {
		throw new Error('Telegram client is not connected');
	}
	const release = await telegramMutex.acquire();
	try {
		const result = await operation(client);
		return result;
	} catch (error) {
		console.error('err', error)
	} finally {
		release();
	}
}

export { telegramMutex };
