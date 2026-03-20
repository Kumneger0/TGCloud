'use client';

import { saveTelegramCredentials } from '@/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/db';
import { getTgClient } from '@/lib/getTgClient';
import { loginInTelegram } from '@/lib/utils';
import { useGlobalStore } from '@/store/global-store';
import { AlertTriangle, Info, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Api } from 'telegram';
import { EntityLike } from 'telegram/define';
import { RPCError } from 'telegram/errors';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';

interface Result {
	chats?: {
		id: string;
		accessHash?: string;
	}[];
}

const errors = {
	createChannel: {
		CHANNELS_ADMIN_LOCATED_TOO_MUCH:
			"You've reached the limit for creating public geogroups. Try creating a private channel instead.",
		CHANNELS_TOO_MUCH:
			"You've joined too many channels or supergroups. Reduce the number of channels you're in to create a new one.",
		CHAT_ABOUT_TOO_LONG: 'The channel description is too long. Please shorten it and try again.',
		CHAT_TITLE_EMPTY: 'Please provide a title for your new channel.',
		USER_RESTRICTED:
			"It seems your account has been restricted due to spam reports. You can't create channels or chats at this time."
	}
} as const;

interface Props {
	user: NonNullable<Awaited<ReturnType<typeof db.query.usersTable.findFirst>>> & {
		telegramSession: string | null;
	};
}

export default function Component({ user }: Props) {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<'bot' | 'user'>('user');
	const [isUserLoading, setIsUserLoading] = useState(false);

	const setBotRateLimit = useGlobalStore((state) => state.setBotRateLimit);

	async function connectTelegramUser() {
		try {
			setIsUserLoading(true);

			let newSession: string | undefined;

			const clientInstance = await getTgClient({
				stringSession: user.telegramSession ?? '',
				authType: 'user'
			});

			if (!clientInstance) {
				toast.error('Failed to initialize Telegram client');
				return;
			}

			if (!user.telegramSession) {
				newSession = await loginInTelegram(clientInstance);
				if (!newSession) {
					setIsUserLoading(false);
					return;
				}
			}

			if (!clientInstance?.connected) {
				await clientInstance?.connect();
			}

			const tgUserSession = newSession ?? user.telegramSession;

			if (!tgUserSession) {
				toast.error('There was an error while connecting to telegram');
				return;
			}

			if (user.channelId && user.accessHash) {
				try {
					const channelId = user.channelId.startsWith('-100')
						? user.channelId
						: `-100${user.channelId}`;
					const entity = await clientInstance.getInputEntity(channelId);
					const testMessage =
						'This is test to message to verify that we can still access this channel';
					const result = await clientInstance.sendMessage(entity, {
						message: testMessage
					});

					if (result.id) {
						clientInstance.deleteMessages(entity, [result.id], { revoke: true }).catch((err) => {
							console.error(err);
						});
						const saveResult = await saveTelegramCredentials({
							session: tgUserSession,
							accessHash: user.accessHash,
							channelId: user.channelId,
							channelTitle: user.channelTitle || user.name + 'Drive',
							authType: 'user'
						});
						saveResult.message &&
							toast[saveResult.success ? 'success' : 'error'](saveResult.message);
						if (saveResult.success) {
							posthog.capture('userTelegramAccountConnect', { userId: user.id });
							router.push('/files');
						}
						return;
					}
				} catch (err) {
					console.error(err);
				}
			}

			const channelDetails = await createTelegramChannel(clientInstance);

			if (channelDetails) {
				toast.success('Channel created');

				const { accessHash, channelTitle, id } = channelDetails;
				const result = await saveTelegramCredentials({
					session: tgUserSession,
					accessHash,
					channelId: id,
					channelTitle,
					authType: 'user'
				});

				if (result.success) {
					posthog.capture('userTelegramAccountConnect', { userId: user.id });
				}

				toast[result.success ? 'success' : 'error'](result.message);
				window.location.href = '/files';
			}
		} catch (err) {
			console.error(err);
			if (err instanceof Error) {
				toast.error(err.message);
			}
		} finally {
			setIsUserLoading(false);
		}
	}
	async function createTelegramChannel(clientInstance: Api.Client) {
		try {
			const channelTitle = user?.name ? `${user?.name}Drive` : 'TGCloudDrive';
			const res = await clientInstance.invoke(
				new Api.channels.CreateChannel({
					title: channelTitle,
					about:
						"Don't delete this channel or you will lose all your files in https://yourtgcloud.vercel.app/",
					broadcast: true
				})
			);

			const result = res as Result;

			const chat =
				Array.isArray(result?.chats) && result.chats.length > 0 ? result.chats[0] : undefined;

			if (chat?.id && chat?.accessHash) {
				return {
					channelTitle,
					id: chat.id,
					accessHash: chat.accessHash
				};
			}
		} catch (err) {
			if (err instanceof RPCError) {
				const text = errors.createChannel[err.errorMessage as keyof typeof errors.createChannel];

				toast.error(text ?? 'There was an error creating the channel');
			} else {
				toast.error((err instanceof Error ? err.message : null) ?? 'There was an error');
			}
		}
	}

	return (
		<div className="min-h-screen flex items-center py-10 bg-background text-foreground">
			<Card className="w-full max-w-6xl mx-auto border-border bg-card text-card-foreground shadow-sm">
				<CardHeader>
					<CardTitle className="text-2xl">Connect Telegram</CardTitle>
					<CardDescription className="text-muted-foreground">
						Choose how you want to connect TG Cloud to Telegram.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Tabs
						defaultValue="user"
						value={activeTab}
						onValueChange={(val) => setActiveTab(val as 'bot' | 'user')}
					>
						<TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 h-auto mb-8 bg-muted">
							<TabsTrigger
								value="user"
								className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground"
							>
								User Account Connection (Recommended)
							</TabsTrigger>
							<TabsTrigger
								value="bot"
								className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground"
							>
								Bot Connection
							</TabsTrigger>
						</TabsList>

						<TabsContent value="bot" className="space-y-6">
							<Alert className="bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-900/30 dark:text-yellow-200">
								<AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
								<AlertTitle>Limitation Warning</AlertTitle>
								<AlertDescription className="text-yellow-700 dark:text-yellow-300/90">
									Telegram bots have lower rate limits and file size restrictions compared to user
									accounts. You might face issues with large files or frequent uploads.
								</AlertDescription>
							</Alert>

							<div className="grid gap-6 md:grid-cols-2">
								<div className="space-y-6">
									{/* Step 1 */}
									<div className="border border-border rounded-lg p-4 bg-card">
										<h3 className="font-semibold flex items-center gap-2 mb-2 text-foreground">
											<span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">
												1
											</span>
											Create Channel
										</h3>
										<p className="text-sm text-muted-foreground mb-2">
											Create a new <strong>Private Channel</strong> on Telegram.
										</p>
									</div>

									{/* Step 2 */}
									<div className="border border-border rounded-lg p-4 bg-card">
										<h3 className="font-semibold flex items-center gap-2 mb-2 text-foreground">
											<span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">
												2
											</span>
											Configure Bot
										</h3>

										<p className="text-sm text-muted-foreground mb-3">
											You must create and use your own Telegram Bot.
										</p>

										<div className="text-sm space-y-3 bg-muted/50 p-3 rounded-md border border-border/50 text-foreground">
											<>
												<p>
													1. Open{' '}
													<a
														href="https://t.me/BotFather"
														target="_blank"
														rel="noreferrer"
														className="text-primary hover:underline"
													>
														@BotFather
													</a>
												</p>
												<p>
													2. Send command{' '}
													<code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs border border-border">
														/newbot
													</code>
												</p>
												<p>
													3. Follow instructions to get your <strong>Bot Token</strong>
												</p>
												<p>
													4. <strong>Important:</strong> Add your new bot to your channel as an
													Admin.
												</p>
											</>
										</div>
									</div>

									{/* Step 3 */}
									<div className="border border-border rounded-lg p-4 bg-card">
										<h3 className="font-semibold flex items-center gap-2 mb-2 text-foreground">
											<span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">
												3
											</span>
											Get Channel ID
										</h3>
										<p className="text-sm text-muted-foreground mb-3">
											The hardest part! Follow carefully:
										</p>
										<ol className="text-sm space-y-2 list-decimal ml-4 text-muted-foreground">
											<li>
												Forward <strong>any message</strong> from your channel to{' '}
												<a
													href="https://t.me/RawDataBot"
													target="_blank"
													rel="noreferrer"
													className="text-primary hover:underline"
												>
													@RawDataBot
												</a>
											</li>
											<li>
												Look for the code block in the response starting with{' '}
												<code className="bg-muted px-1 rounded text-foreground">
													&quot;forward_from_chat&quot;
												</code>
											</li>
											<li>
												Copy the <code className="bg-muted px-1 rounded text-foreground">id</code>{' '}
												(starts with -100)
											</li>
										</ol>

										<details className="mt-3 group">
											<summary className="text-xs text-primary cursor-pointer hover:underline select-none font-medium">
												Show me where to find the ID
											</summary>
											<div className="mt-2 p-3 bg-zinc-950 rounded-md text-xs font-mono text-zinc-300 overflow-x-auto border border-zinc-800 shadow-inner">
												<pre>{`{
  "message": {
    ...
    "forward_from_chat": {
        "id": -1001234567890,  <-- COPY THIS
        "title": "My Cloud",
        "type": "channel"
    },
    ...
  }
}`}</pre>
											</div>
										</details>
									</div>
								</div>

								<div className="flex flex-col h-full">
									<div className="sticky top-6">
										<h3 className="text-lg font-semibold mb-4 text-foreground">
											Final Step: Connect
										</h3>
										<form
											action={async (formData) => {
												const channelId = formData.get('channelId');
												const botToken = formData.get('botToken');

												if (!channelId) return;

												if (!botToken) {
													toast.error('Please enter your bot token');
													return;
												}

												const getTgClientArgs: Parameters<typeof getTgClient>[0] = {
													authType: 'bot',
													botToken: (botToken as string | undefined) || undefined,
													setBotRateLimit
												};

												try {
													const client = await getTgClient(getTgClientArgs);
													if (!client) {
														toast.error('Failed to connect to telegram');
														return;
													}
													const dialogs = await client?.getInputEntity(
														String(channelId) as EntityLike
													);
													const id = (dialogs as unknown as { channelId: string })?.channelId;
													const accessHash = (dialogs as unknown as { accessHash: string })
														?.accessHash;
													const sentMessage = await client?.sendMessage(channelId as EntityLike, {
														message:
															' Yay! You have successfully connected your Telegram channel with our platform! '
													});
													if (sentMessage?.id) {
														if (id == null || accessHash == null) {
															toast.error(
																'Failed to retrieve channel ID or access hash. Please check Bot permissions.'
															);
															return;
														}
														const result = await saveTelegramCredentials({
															channelId: String(id),
															accessHash: String(accessHash),
															channelTitle: '',
															botToken: (botToken as string | null) || undefined,
															authType: 'bot'
														});
														if (!result.success) {
															toast.error(result.message);
															return;
														}
														toast.success('Channel Connected Successfully');
														typeof window !== 'undefined' && window.location.replace('/files');
													}
												} catch (err) {
													toast.error('Failed to connect channel. Check ID and Bot permissions.');
													console.error(err);
												}
											}}
											className="space-y-4 bg-card border border-border rounded-lg p-6 shadow-sm"
										>
											<div className="space-y-2">
												<Label htmlFor="channelId" className="text-foreground">
													Channel ID
												</Label>
												<Input
													name="channelId"
													id="channelId"
													type="text"
													defaultValue={
														user.channelId
															? user.channelId.startsWith('-100')
																? user.channelId
																: `-100${user.channelId}`
															: ''
													}
													placeholder="-1001234567890"
													required
													className="font-mono bg-background border-input placeholder:text-muted-foreground focus-visible:ring-ring"
												/>
												<p className="text-[10px] text-muted-foreground">Must start with -100</p>
											</div>

											<div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
												<label htmlFor="botToken" className="text-sm font-medium text-foreground">
													Bot Token
													<span className="text-destructive ml-1">*</span>
												</label>
												<Input
													type="text"
													id="botToken"
													name="botToken"
													placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
													className="font-mono text-sm bg-background border-input placeholder:text-muted-foreground focus-visible:ring-ring"
													required
												/>
												<p className="text-[10px] text-muted-foreground">From @BotFather</p>
											</div>

											<div className="pt-2">
												<ConnectChannelButton />
											</div>
										</form>
									</div>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="user" className="space-y-6 max-w-2xl mx-auto">
							<Alert className="border-primary/20 bg-primary/5 text-foreground">
								<ShieldCheck className="h-4 w-4 text-primary" />
								<AlertTitle className="text-lg font-bold mb-2">
									Recommended Security Steps:
								</AlertTitle>
								<AlertDescription className="space-y-3 text-sm text-muted-foreground">
									<ul className="list-disc pl-5 space-y-1">
										<li>
											Use a{' '}
											<span className="font-bold text-foreground">secondary Telegram account</span>{' '}
											for this connection to keep your main account private.
										</li>
										<li>Create the channel using your secondary account.</li>
										<li>
											Add your{' '}
											<span className="font-bold text-foreground">main account as an admin</span> to
											this channel.
										</li>
										<li>
											<span className="font-bold text-foreground">Transfer channel ownership</span>{' '}
											to your main account.
										</li>
									</ul>
									<p className="mt-3 text-xs opacity-90 italic">
										This setup ensures that even if your secondary account gets banned, you can
										still access all your files through your main account.
									</p>
								</AlertDescription>
							</Alert>

							<Alert className="bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/10 dark:border-blue-800/50 dark:text-blue-200">
								<Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
								<AlertTitle>Note on Exclusivity</AlertTitle>
								<AlertDescription className="text-blue-800 dark:text-blue-300/90">
									You can only use one connection method at a time. If you connect via User Account,
									you don&apos;t need to use the Bot connection, and vice versa. However, you can
									easily switch between User mode and Bot mode at any time later if you want.
								</AlertDescription>
							</Alert>

							<div className="flex flex-col items-center gap-6 pt-6">
								<p className="text-center text-muted-foreground">
									By clicking the button below, you acknowledge the risks and confirm you are using
									a secondary account or accept full responsibility.
								</p>
								<Button
									size="lg"
									variant="default"
									className="w-full sm:w-auto min-w-[200px]"
									onClick={connectTelegramUser}
									disabled={isUserLoading}
								>
									{isUserLoading ? 'Waiting for input...' : 'Connect Telegram Account'}
								</Button>
								{isUserLoading && (
									<p className="text-sm text-yellow-600 animate-pulse">
										Please check the popup dialogs to enter your phone number and verification code.
									</p>
								)}
							</div>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
}

function ConnectChannelButton() {
	const { pending } = useFormStatus();
	return (
		<Button disabled={pending} type="submit" className="w-full">
			{pending ? 'please wait' : 'Connect Channel'}
		</Button>
	);
}
