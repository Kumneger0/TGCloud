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
import { ChevronsUpDown, HelpCircle, LogOut } from 'lucide-react';
import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AddNewBotTokenDialog } from './addNewBotToken';
import { USER_TELEGRAM_SESSION_COOKIE_NAME } from '@/lib/consts';

export default async function ProfileMenu() {
	const user = await getUser();
	const cookieStore = await cookies()

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
					<div className="flex flex-col space-y-1">
						<p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
						<p className="text-xs leading-none text-muted-foreground">
							{user?.email || 'user@example.com'}
						</p>
						<p className="text-xs leading-none text-muted-foreground mt-1">
							Plan:{' '}
							{user?.plan
								? `${user.plan.charAt(0).toUpperCase()}${user.plan.slice(1).toLowerCase()}`
								: 'Free Tier'}
						</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href="/support" className="flex items-center">
						<HelpCircle className="mr-2 h-4 w-4" />
						<span>Support</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<AddNewBotTokenDialog />
				</DropdownMenuItem>
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
