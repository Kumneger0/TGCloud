'use client';

import { saveTelegramCredentials } from '@/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/db';
import { getTgClient } from '@/lib/getTgClient';
import { errorToast } from '@/lib/notify';
import { EntityLike } from 'telegram/define';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { Api } from 'telegram';
import { RPCError } from 'telegram/errors';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import { useGlobalStore } from '@/store/global-store';

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

async function getPhoneNumber() {
	return await Swal.fire({
		title: 'Enter your phone number',
		html: `
      <label for="phone-input">Phone Number (include country code, e.g., +1)</label>
      <input type="text" id="phone-input" class="swal2-input" placeholder="+1 (555) 555-5555">
    `,
		inputAttributes: {
			inputmode: 'tel',
			pattern: '\\+[0-9]{1,3}\\s?[0-9]{10}'
		},
		showCancelButton: true,
		confirmButtonColor: '#000000',

		preConfirm: () => {
			const phoneNumber = (Swal?.getPopup()?.querySelector('#phone-input') as HTMLInputElement)
				.value;
			if (!/^\+\d{1,3}\s?\d{10,15}$/.test(phoneNumber.replace(/\s/g, ''))) {
				Swal.showValidationMessage(
					'Please enter a valid phone number with the country code, e.g., +1 (555) 555-5555'
				);
			}
			return phoneNumber;
		}
	}).then((result) => result.value);
}

async function getCode() {
	return await Swal.fire({
		title: 'Enter the verification code',
		html: `
      <label for="code-input">Verification Code</label>
      <input type="text" id="code-input" class="swal2-input" placeholder="Please enter the code you received from Telegram">
    `,
		inputAttributes: {
			inputmode: 'numeric',
			pattern: '[0-9]{6}'
		},
		showCancelButton: true,
		confirmButtonColor: '#000000',

		preConfirm: () => {
			const code = (Swal?.getPopup()?.querySelector('#code-input') as HTMLInputElement).value;
			if (!/^\d{5}$/.test(code)) {
				Swal.showValidationMessage('Please enter a valid 5-digit verification code.');
			}
			return code;
		}
	}).then((result) => result.value);
}

async function getPassword() {
	return await Swal.fire({
		title: 'Enter Your Password',
		html: `
      <label for="password-input">Password</label>
      <input type="password" id="password-input" class="swal2-input" placeholder="Please enter your password">
      <div style="display: flex; align-items: center; justify-content: center; margin-top: 10px;">
        <input type="checkbox" id="toggle-password">
        <label for="toggle-password" style="margin-left: 5px;">Show Password</label>
      </div>
    `,
		showCancelButton: true,
		confirmButtonColor: '#000000',
		didOpen: () => {
			const passwordInput = Swal?.getPopup()?.querySelector('#password-input') as HTMLInputElement;
			const togglePassword = Swal?.getPopup()?.querySelector(
				'#toggle-password'
			) as HTMLInputElement;

			togglePassword.addEventListener('change', () => {
				if (togglePassword.checked) {
					passwordInput.type = 'text';
				} else {
					passwordInput.type = 'password';
				}
			});
		},
		preConfirm: () => {
			const password = (Swal?.getPopup()?.querySelector('#password-input') as HTMLInputElement)
				.value;
			if (!password) {
				Swal.showValidationMessage('Please enter your password.');
			}
			return password;
		}
	}).then((result) => result.value);
}

interface Props {
	user: NonNullable<Awaited<ReturnType<typeof db.query.usersTable.findFirst>>>;
}

export default function Component({ user }: Props) {
	const router = useRouter();
	const [selectedBot, setSelectedBot] = useState<'default' | 'custom'>('default');
	const [activeTab, setActiveTab] = useState<'bot' | 'user'>('user');
	const [isUserLoading, setIsUserLoading] = useState(false);

	const session = useGlobalStore((state) => state.telegramSession);
	const client = getTgClient({ stringSession: session ?? '', authType: 'user' });

	const setBotRateLimit = useGlobalStore((state) => state.setBotRateLimit);

	async function connectTelegramUser() {
		try {
			setIsUserLoading(true);

			let newSession: string | undefined;
			if (!session) {
				newSession = await loginInTelegram();
				if (!newSession) {
					setIsUserLoading(false);
					return;
				}
			}

			const clientInstance = await client;
			if (!clientInstance) {
				toast.error('Failed to initialize Telegram client');
				return;
			}
			if (!clientInstance?.connected) {
				await clientInstance?.connect();
			}

			const tgUserSession = newSession ?? session;

			if (!tgUserSession) {
				toast.error('There was an error while connecting to telegram');
				return;
			}

			if (user.channelId && user.channelTitle && user.accessHash) {
				await saveTelegramCredentials({
					session: tgUserSession,
					accessHash: user.accessHash,
					channelId: user.channelId,
					channelTitle: user.channelTitle
				});
				posthog.capture('userTelegramAccountConnect', { property: user.email });
				router.push('/files');
				return;
			}

			const channelDetails = await createTelegramChannel(clientInstance);

			if (channelDetails) {
				Swal.fire({
					title: 'Channel created',
					text: 'We have created a channel in Telegram for you',
					timer: 3000,
					icon: 'success'
				});

				const { accessHash, channelTitle, id } = channelDetails;
				await saveTelegramCredentials({
					session: tgUserSession,
					accessHash,
					channelId: id,
					channelTitle
				});

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

	async function loginInTelegram() {
		try {
			const clientInstance = await client;
			if (!clientInstance) return;

			await clientInstance?.start({
				phoneNumber: async () => (await getPhoneNumber()) as unknown as string,
				password: async () => (await getPassword()) as unknown as string,
				phoneCode: async () => (await getCode()) as unknown as string,
				onError: (err) => errorToast(err?.message)
			});

			const session = clientInstance?.session.save() as unknown as string;
			return session;
		} catch (err) {
			if (err && typeof err == 'object' && 'message' in err) {
				Swal.fire({
					title: 'Failed to login',
					text: (err?.message as string) ?? 'There was an error',
					icon: 'error'
				});
			}
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

			if (result?.chats?.[0].id) {
				return {
					channelTitle,
					id: result.chats?.[0].id,
					accessHash: result.chats?.[0].accessHash!
				};
			}
		} catch (err) {
			if (err instanceof RPCError) {
				const text = errors.createChannel[err.errorMessage as keyof typeof errors.createChannel];

				Swal.fire({
					title: err.message,
					text: text ?? 'There was an error creating the channel',
					timer: 3000,
					icon: 'error'
				});
			} else {
				Swal.fire({
					title: 'Failed to create channel',
					//@ts-expect-error
					text: err?.message! ?? 'There was an error',
					timer: 3000,
					icon: 'error'
				});
			}
		}
	}

	return (
		<div className="min-h-screen flex items-center py-10">
			<Card className="w-full max-w-6xl mx-auto">
				<CardHeader>
					<CardTitle>Connect Telegram</CardTitle>
					<CardDescription>Choose how you want to connect TG Cloud to Telegram.</CardDescription>
				</CardHeader>
				<CardContent>
					<Tabs
						defaultValue="user"
						value={activeTab}
						onValueChange={(val) => setActiveTab(val as 'bot' | 'user')}
					>
						<TabsList className="grid w-full grid-cols-2 mb-8">
							<TabsTrigger value="bot">Bot Connection</TabsTrigger>
							<TabsTrigger value="user">User Account Connection (Recommended)</TabsTrigger>
						</TabsList>

						<TabsContent value="bot" className="space-y-6">
							<Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800">
								<AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
								<AlertTitle className="text-yellow-800 dark:text-yellow-300">
									Limitation Warning
								</AlertTitle>
								<AlertDescription className="text-yellow-700 dark:text-yellow-300">
									Telegram bots have lower rate limits and file size restrictions compared to user
									accounts. You might face issues with large files or frequent uploads.
								</AlertDescription>
							</Alert>
							<div className="flex flex-col lg:flex-row gap-6">
								<div className="flex-1 space-y-4">
									<div className="space-y-2">
										<h3 className="font-semibold">Step 1: Create and Set Up Your Channel</h3>
										<p className="text-sm text-gray-600">
											Create a private Telegram channel if you haven&apos;t already.
										</p>
									</div>
									<div className="space-y-2">
										<h3 className="font-semibold">Step 2: Choose Bot</h3>
										<RadioGroup
											defaultValue="default"
											onValueChange={(value) => setSelectedBot(value as 'default' | 'custom')}
											className="space-y-2"
										>
											<div className="flex items-center space-x-2">
												<RadioGroupItem value="default" id="default" />
												<Label htmlFor="default">
													<a
														href="https://t.me/tgcloudet2024_bot?start=setup_tgcloud"
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-500 underline"
													>
														Use TGCloud Bot
													</a>
													<span className="block text-sm text-gray-600">
														Our default bot with standard features
													</span>
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<RadioGroupItem value="custom" id="custom" />
												<Label htmlFor="custom">
													Use Custom Bot
													<span className="block text-sm text-gray-600">Recommended</span>
												</Label>
											</div>
										</RadioGroup>

										<div className="mt-4 space-y-2">
											<p className="text-sm text-gray-600">
												To use {selectedBot === 'custom' ? 'your own bot' : 'TGCloud Bot'}:
												<ol className="list-decimal ml-5 mt-2">
													{selectedBot === 'custom' && (
														<li>
															Create a new bot with{' '}
															<a
																href="https://t.me/BotFather"
																target="_blank"
																rel="noopener noreferrer"
																className="text-blue-600 hover:underline"
															>
																@BotFather
															</a>
														</li>
													)}
													<li>
														{selectedBot === 'custom'
															? 'Copy the bot token provided'
															: 'Add the bot as admin'}
													</li>
													<li>Add the bot to your channel as admin with posting permissions</li>
													<li>
														{selectedBot === 'custom' ? 'Paste the bot token below' : 'Done!'}
													</li>
												</ol>
											</p>
										</div>
									</div>
									<div className="space-y-2">
										<h3 className="font-semibold">Step 3: Get Channel ID</h3>
										<p className="text-sm text-gray-600">
											1. Forward any message from your channel to{' '}
											<a
												href="https://t.me/RawDataBot"
												target="_blank"
												rel="noopener noreferrer"
												className="text-blue-600 hover:underline"
											>
												@RawDataBot
											</a>
											<br />
											2. Look for the &quot;id&quot; field in the response (format: -100xxxxxxxxxx)
											<br />
											3. Copy and paste this ID below
										</p>
										<details className="mt-2">
											<summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
												View example response from RawDataBot
											</summary>
											<div className="mt-2">
												<pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md text-xs overflow-x-auto whitespace-pre text-gray-800 dark:text-gray-200">
													{`{
    "update_id": 846844456,
    "message": {
        "message_id": 3123678,
        "from": {
            "id": 5660513633,
            "is_bot": false,
            "first_name": "John Doe",
            "username": "johndoe123",
            "language_code": "en"
        },
        "chat": {
            "id": 5660513633,
            "first_name": "John Doe",
            "username": "johndoe123",
            "type": "private"
        },
        "date": 1732815925,
        "forward_origin": {
            "type": "channel",
            "chat": {
                "id": -1002254371734,  ⬅️ Copy this channel ID
                "title": "hfh",
                "type": "channel"
            },
            "message_id": 2,
            "date": 1732815917
        },
        "forward_from_chat": {
            "id": -1002254371734,
            "title": "hfh",
            "type": "channel"
        },
        "forward_from_message_id": 2,
        "forward_date": 1732815917,
        "text": "ddd"
    }
}`}
												</pre>
											</div>
										</details>
									</div>
								</div>

								<div className="flex-1 lg:border-l lg:pl-6">
									<div className="max-w-md space-y-6">
										<div>
											<h3 className="text-lg font-semibold mb-4">Enter Your Channel ID</h3>
											<form
												action={async (formData) => {
													const channelId = formData.get('channelId');
													const botToken = formData.get('botToken');

													if (!channelId) return;

													if (selectedBot === 'custom' && !botToken) {
														toast.error('Please enter your bot token');
														return;
													}

													const getTgClientArgs: Parameters<typeof getTgClient>[0] = {
														authType: 'bot',
														botToken: botToken as string,
														setBotRateLimit
													};

													try {
														const client = await getTgClient(getTgClientArgs);
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
															await saveTelegramCredentials({
																channelId: String(id) as string,
																accessHash: String(accessHash),
																session: 'this is test session',
																channelTitle: '',
																botToken: botToken as string
															});
															toast.success('Channel Connected Successfully');
															typeof window !== 'undefined' && window.location.replace('/files');
														}
													} catch (err) {
														toast.error('Failed to connect channel');
													}
												}}
												className="space-y-4"
											>
												<div className="space-y-2">
													<Label htmlFor="channelId">Channel ID</Label>
													<Input
														name="channelId"
														id="channelId"
														type="text"
														placeholder="-1001234567890"
														required
													/>
												</div>
												{selectedBot === 'custom' && (
													<div className="space-y-2">
														<label htmlFor="botToken" className="text-sm font-medium">
															Bot Token
															<span className="text-red-500">*</span>
														</label>
														<Input
															type="text"
															id="botToken"
															name="botToken"
															placeholder="Enter your bot token from @BotFather"
															className="w-full"
															required
														/>
													</div>
												)}
												<ConnectChannelButton />
											</form>
										</div>
									</div>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="user" className="space-y-6 max-w-2xl mx-auto">
							<Alert
								variant="destructive"
								className="border-red-500/50 bg-red-50 dark:bg-red-900/10"
							>
								<AlertTriangle className="h-4 w-4" />
								<AlertTitle className="text-lg font-bold mb-2">
									Warning: Account Safety Risk
								</AlertTitle>
								<AlertDescription className="space-y-3 text-sm">
									<p>
										Connecting a personal Telegram account has inherent risks. Telegram may
										temporarily or permanently ban accounts that show automated behavior.
									</p>
									<div className="font-semibold mt-2">
										To protect your main account, you MUST follow these steps:
									</div>
									<ul className="list-disc pl-5 space-y-1">
										<li>
											Use a <span className="font-bold">secondary Telegram account</span> for this
											connection. Do NOT use your main personal account.
										</li>
										<li>Create the channel using your secondary account.</li>
										<li>
											Add your <span className="font-bold">main account as an admin</span> to this
											channel.
										</li>
										<li>
											<span className="font-bold">Transfer channel ownership</span> to your main
											account.
										</li>
									</ul>
									<p className="mt-2 text-xs opacity-90">
										This ensures that even if the secondary account connected to TG Cloud is banned,
										you will retain access to your files through your main account. We are not
										responsible for any account bans.
									</p>
								</AlertDescription>
							</Alert>

							<Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800">
								<Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
								<AlertTitle className="text-blue-800 dark:text-blue-300">
									Note on Exclusivity
								</AlertTitle>
								<AlertDescription className="text-blue-700 dark:text-blue-300">
									You can only use one connection method at a time. If you connect via User Account,
									you don&apos;t need to use the Bot connection, and vice versa.
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
