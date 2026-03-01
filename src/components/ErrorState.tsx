import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { ReactNode, useState } from 'react';

interface ErrorStateProps {
	title: string;
	description: string;
	icon?: ReactNode;
	warning?: string | ReactNode;
	actionButton?: {
		label: string;
		onClick: () => Promise<void>;
		disabled?: boolean;
		variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
		className?: string;
	};
	secondaryAction?: {
		label: string;
		onClick: () => Promise<void>;
		disabled?: boolean;
		variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
		className?: string;
	};
	children?: ReactNode;
}

export function ErrorState({
	title,
	description,
	icon,
	warning,
	actionButton,
	secondaryAction,
	children
}: ErrorStateProps) {
	const [loading, setLoading] = useState(false);
	return (
		<div className="flex flex-col gap-6 py-4">
			<div className="flex flex-col items-center gap-4 text-center">
				<div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
					{icon || <AlertCircle size={28} />}
				</div>
				<div className="space-y-2">
					<h3 className="text-xl font-semibold">{title}</h3>
					<p className="text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
				</div>
			</div>

			{children}

			{warning && (
				<div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4 space-y-2">
					<div className="flex items-center gap-2 text-destructive">
						<AlertCircle size={16} />
						<span className="text-sm font-semibold uppercase tracking-wider">Warning</span>
					</div>
					<div className="text-sm text-destructive opacity-90 leading-relaxed">
						{typeof warning === 'string' ? (
							<p>{warning}</p>
						) : (
							warning
						)}
					</div>
				</div>
			)}

			{(actionButton || secondaryAction) && (
				<div className="flex flex-col gap-2">
					{actionButton && (
						<Button
							variant={actionButton.variant || 'default'}
							className={`w-full ${actionButton.className || ''}`}
							onClick={async () => {
								setLoading(true);
								try {
									await actionButton.onClick();
								} finally {
									setLoading(false);
								}
							}}
							disabled={actionButton.disabled || loading}
						>
							{actionButton.label}
						</Button>
					)}
					{secondaryAction && (
						<Button
							variant={secondaryAction.variant || 'outline'}
							className={`w-full ${secondaryAction.className || ''}`}
							onClick={secondaryAction.onClick}
							disabled={secondaryAction.disabled || loading}
						>
							{secondaryAction.label}
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
