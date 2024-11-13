import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Settings, HelpCircle, LogOut } from 'lucide-react';
import { getUser } from '@/actions';

export default async function ProfileMenu() {
	const user = await getUser();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="relative h-8 w-8 rounded-full">
					<Avatar className="h-8 w-8">
						<AvatarImage
							src={user?.imageUrl || '/placeholder.svg?height=32&width=32'}
							alt={user?.name || 'User'}
						/>
						<AvatarFallback>{user?.name?.slice(0, 2).toUpperCase() || 'UN'}</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" forceMount>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
						<p className="text-xs leading-none text-muted-foreground">
							{user?.email || 'user@example.com'}
						</p>
						{user?.plan && (
							<p className="text-xs leading-none text-muted-foreground mt-1">
								Plan: {user.plan.charAt(0).toUpperCase() + user.plan.slice(1).toLowerCase()}
							</p>
						)}
					</div>
				</DropdownMenuLabel>
				{/* <DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href="/profile">
						<User className="mr-2 h-4 w-4" />
						<span>Profile</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link href="/settings">
						<Settings className="mr-2 h-4 w-4" />
						<span>Settings</span>
					</Link>
				</DropdownMenuItem> */}
				<DropdownMenuItem asChild>
					<Link href="/support">
						<HelpCircle className="mr-2 h-4 w-4" />
						<span>Support</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<LogOut className="mr-2 h-4 w-4" />
					<span>Log out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
