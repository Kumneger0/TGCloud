'use client';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from './ui/dialog';
import { getUser, addToken, saveTelegramCredentials } from '@/actions';
import { getTgClient } from '@/lib/getTgClient';
import { EntityLike } from 'telegram/define';
import toast from 'react-hot-toast';
import { useGlobalStore } from '@/store/global-store';

export function AddNewBotTokenDialog() {
	const [isOpen, setIsOpen] = useState(false);
	const [botToken, setBotToken] = useState('');
	const [error, setError] = useState('');

	const setBotRateLimit = useGlobalStore((state) => state.setBotRateLimit);

	return (
		<>
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogTrigger asChild>
					<Button variant="outline" className="w-full border-none flex items-center justify-start">
						New bot
					</Button>
				</DialogTrigger>
				<DialogContent className="space-y-6">
					<DialogHeader>
						<h2 className="text-lg font-medium">Add a new Telegram bot token</h2>
					</DialogHeader>
					<div className="space-y-1">
						<input
							type="text"
							placeholder="1234567890:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
							className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
							value={botToken}
							onChange={(e) => setBotToken(e.target.value)}
						/>
						{error && <p className="text-xs text-red-500">{error}</p>}
					</div>
					<div className="flex justify-end space-x-2">
						<Button variant="outline" onClick={() => setIsOpen(false)}>
							Cancel
						</Button>
						<form
							action={async () => {
								try {
									const user = await getUser();
									if (!user || !user.id) return;
									const getTgClientArgs: Parameters<typeof getTgClient>[0] = {
										authType: 'bot',
										botToken: botToken,
										setBotRateLimit
									};
									const client = await getTgClient(getTgClientArgs);
									if (!client) {
										toast.error('Invalid bot token');
										return;
									}
									const entity = await client.getInputEntity(
										`-100${user?.channelId}` as EntityLike
									);

									const testMessage = await client?.sendMessage(
										`-100${user.channelId}` as EntityLike,
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
										await saveTelegramCredentials({
											accessHash: user.accessHash!,
											channelId: String(id),
											channelTitle: user.channelTitle!,
											session: 'user session'
										});
										setIsOpen(false);
										typeof window !== 'undefined' && window.location.reload();
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
				</DialogContent>
			</Dialog>
		</>
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
