'use client';
import { addToken, saveTelegramCredentials } from '@/actions';
import { Button } from '@/components/ui/button';
import { getTgClient } from '@/lib/getTgClient';
import { useGlobalStore } from '@/store/global-store';
import { useGlobalModal } from '@/store/global-modal';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { Input } from './ui/input';

function AddNewBotTokenForm() {
	const [botToken, setBotToken] = useState('');
	const [error, setError] = useState('');
	const setBotRateLimit = useGlobalStore((state) => state.setBotRateLimit);
	const user = useGlobalStore((s) => s.user);
	const closeModal = useGlobalModal((state) => state.closeModal);

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<Input
					type="text"
					placeholder="1234567890:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
					className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
					value={botToken}
					onChange={(e) => setBotToken(e.target.value)}
				/>
				{error && <p className="text-xs text-red-500">{error}</p>}
			</div>
			<div className="flex justify-end space-x-2">
				<Button variant="outline" onClick={() => closeModal()}>
					Cancel
				</Button>
				<form
					action={async () => {
						try {
							console.log('user', user)
							if (!user || !user.id) {
								toast.error('Something went wrong, please try again later');
								return;
							};
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
							if (!client.connected) await client.connect()
							if (!user.channelId) {
								toast.error('Something went wrong, please try again later');
								return;
							}
							const channelId = user.channelId.startsWith('-100')
								? user.channelId
								: `-100${user.channelId}`;

							const entity = await client.getInputEntity(channelId);
							const testMessage = await client?.sendMessage(
								entity,
								{
									message: 'You are successfully added new bot token'
								}
							);
							if (testMessage.id) {
								toast.success('You are successfully added new bot token');
								await addToken(botToken);
								const id = (
									entity as unknown as {
										channelId: string;
									}
								)?.channelId;
								const result = await saveTelegramCredentials({
									accessHash: user.accessHash!,
									channelId: String(id),
									channelTitle: user.channelTitle!,
									authType: 'bot'
								});
								result.message && toast[result.success ? "success" : "error"](result.message);
								if (result.success) {
									closeModal();
									window.location.reload();
								}
							}
						} catch (err) {
							toast.error('There was an error occured, please try again');
							setError(
								'There was an error occurred, make sure you add the bot as admin to the channel and then try again. If you already did, please try again later.'
							);
						}
					}}
				>
					<AddTokenButtons type="submit">Add</AddTokenButtons>
				</form>
			</div>
		</div>
	);
}

export function AddNewBotTokenDialog() {
	const openModal = useGlobalModal((state) => state.openModal);

	return (
		<Button
			variant="outline"
			className="w-full border-none flex items-center justify-start"
			onClick={() => {
				openModal({
					title: "Add a new Telegram bot token",
					content: <AddNewBotTokenForm />
				})
			}}
		>
			New bot
		</Button>
	);
}

function AddTokenButtons(props: React.ComponentProps<typeof Button>) {
	const { pending } = useFormStatus();
	return (
		<Button disabled={pending} variant="outline" {...props}>
			{pending ? 'please wait' : 'Add'}
		</Button>
	);
}
