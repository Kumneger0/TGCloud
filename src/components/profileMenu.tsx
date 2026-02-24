import { getUser } from '@/actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { auth } from '@/lib/auth';
import { USER_TELEGRAM_SESSION_COOKIE_NAME } from '@/lib/consts';
import { ChevronsUpDown, HelpCircle, LogOut } from 'lucide-react';
import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AddNewBotTokenDialog } from './addNewBotToken';
import { ChannelInfo } from './channelInfo';
import { ModeSwitcher } from './modeSwitcher';

export default async function ProfileMenu() {
	const user = await getUser();
	if (!user) {
		redirect('/login');
	}

	const cookieStore = await cookies()
	const tgSession = cookieStore.get(USER_TELEGRAM_SESSION_COOKIE_NAME)?.value || null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="w-full max-w-[200px] justify-between bg-zinc-900 hover:bg-zinc-900/90 text-white rounded-lg p-2"
				>
					<div className="flex items-center gap-2">
						<Avatar className="h-8 w-8">
							<AvatarImage
								src={user?.imageUrl || 'https://api.dicebear.com/9.x/lorelei/svg'}
								alt={user?.name || 'User'}
							/>
							<AvatarFallback>{user?.name?.slice(0, 2).toUpperCase() || 'UN'}</AvatarFallback>
						</Avatar>
						<span className="text-sm font-medium">{user?.name || 'User'}</span>
					</div>
					<ChevronsUpDown className="h-4 w-4 opacity-50" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" forceMount>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-2">
						<div className="flex flex-col space-y-1">
							<p className="text-sm font-semibold leading-none text-foreground">
								{user?.authType === 'bot' ? 'Bot Operation Mode' : (user?.name || 'User')}
							</p>
							<p className="text-xs leading-none text-muted-foreground truncate">
								{user?.email || 'user@example.com'}
							</p>
						</div>

						<div className="pt-2 mt-1 border-t border-border/50 space-y-2">
							<div>
								<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1">
									Storage Channel
								</p>
								<ChannelInfo
									initialTitle={user?.channelTitle || ''}
									channelId={user?.channelId || ''}
									authType={user?.authType as 'bot' | 'user'}
								/>
							</div>

							{user?.authType === 'bot' && user.botTokens && user.botTokens.length > 0 && (
								<div>
									<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1">
										Connected Bots
									</p>
									<p className="text-xs font-medium text-foreground">
										{user.botTokens.filter(({ token }) => token !== process.env.NEXT_PUBLIC_BOT_TOKEN).length} active {user.botTokens.length === 1 ? 'bot' : 'bots'}
									</p>
								</div>
							)}
						</div>
					</div>

				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuLabel className="pb-1">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
							Operation Mode
						</span>
						<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${user?.authType === 'bot' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
							{user?.authType || 'User'}
						</span>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuItem
					className="flex items-center"
					asChild
				>
					<ModeSwitcher
						authType={user?.authType as 'bot' | 'user'}
						hasBotTokens={(user?.botTokens?.length ?? 0) > 0}
						telegramSession={tgSession}
						user={{ ...user, telegramSession: tgSession ?? undefined }}
					/>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href="/support" className="flex items-center">
						<HelpCircle className="mr-2 h-4 w-4" />
						<span>Support</span>
					</Link>
				</DropdownMenuItem>
				{user?.authType === 'bot' && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<AddNewBotTokenDialog />
						</DropdownMenuItem>
					</>
				)}
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<form
						action={async () => {
							'use server';
							const logoutResult = await auth.api.signOut({
								headers: await headers()
							});
							cookieStore.delete(USER_TELEGRAM_SESSION_COOKIE_NAME);
							if (logoutResult.success) {
								redirect('/login');
							}
						}}
					>
						<button className="flex items-center w-full">
							<LogOut className="mr-2 h-4 w-4" />
							<span>Log out</span>
						</button>
					</form>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
