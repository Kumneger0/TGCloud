import { getUser } from '@/actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { db } from '@/db';
import { formatBytes } from '@/lib/utils';
import { HardDrive, Infinity } from 'lucide-react';

export default async function SpaceUsageIndicator() {
	const user = await getUser();
	const userId = user?.id;
	if (!userId) return null;

	const fileSizes = await db.query.userFiles.findMany({
		where(fields, { eq }) {
			return eq(fields.userId, userId);
		},
		columns: {
			size: true
		}
	});

	const formattedUsedSpace = formatBytes(
		fileSizes.map((file) => Number(file.size)).reduce((acc, curr) => acc + curr, 0) + 100
	);
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="flex items-center space-x-2 bg-zinc-800 rounded-md p-2">
						<HardDrive className="h-4 w-4 text-zinc-400" />
						<span className="text-sm text-zinc-300">{formattedUsedSpace}</span>
						<span className="text-zinc-400">/</span>
						<Infinity className="h-4 w-4 text-zinc-400" />
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>{`${formattedUsedSpace} used of unlimited storage`}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
