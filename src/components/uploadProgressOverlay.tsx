'use client';
import { getGlobalTGCloudContext } from '@/lib/context';
import { Progress } from './ui/progress';
export function UploadProgressOverlay() {
	const tgCloudContext = getGlobalTGCloudContext();
	if (!tgCloudContext) return null;
	const progress = tgCloudContext.uploadProgress;
	if (!progress) return null;
	const progressPercentage = Math.round(progress.progress * 100);

	return (
		<div className="fixed bottom-4 right-4 z-50">
			<div className="bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg shadow-lg p-4 min-w-[320px]">
				<div className="flex justify-between items-center mb-4">
					<h3 className="font-semibold">Uploading Files</h3>
				</div>

				<div className="space-y-3">
					<div className="flex justify-between items-center text-sm">
						<span
							className="text-muted-foreground font-medium truncate max-w-[200px]"
							title={progress.itemName}
						>
							{progress.itemName}
						</span>
						<span className="text-muted-foreground ml-2">
							{progress.itemIndex + 1} of {progress.total}
						</span>
					</div>

					<div className="space-y-1.5">
						<Progress value={progressPercentage} />
						<div className="text-xs text-muted-foreground text-right">{progressPercentage}%</div>
					</div>
				</div>
			</div>
		</div>
	);
}
