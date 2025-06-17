import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import React from 'react';
import { env } from '@/env';
import { Resend } from 'resend';
import { CustomButton } from '@/components/login';
import { redirect } from 'next/navigation';

async function acceptSupport(user: string, email: string, message: string) {
	try {
		const resend = new Resend(env.RESEND_API_KEY);
		await resend.emails.send({
			from: env.supportMail!,
			to: env.supportRecipients!,
			subject: 'new Support Request',
			text: `
			Name: ${user}
			Email: ${email}
			Message: ${message}
			`
		});
		return true;
	} catch (error) {
		console.error(error);
		return false;
	}
}

export default async function SupportPage({
	searchParams
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const success = (await searchParams).success;

	return (
		<main className="flex-1 bg-background text-foreground">
			<section className="w-full py-12 md:py-24 lg:py-32">
				{success === 'true' && (
					<div className="container px-4 md:px-6">
						<div className="flex flex-col items-center space-y-4 text-center">
							<p className="text-center text-sm font-medium text-green-600 dark:text-green-400">
								Your message has been sent successfully. We&apos;ll get back to you soon.
							</p>
						</div>
					</div>
				)}
				<div className="container px-4 md:px-6">
					<div className="flex flex-col items-center space-y-4 text-center">
						<div className="space-y-2">
							<h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
								Support
							</h1>
							<p className="mx-auto max-w-[700px] text-sm text-muted-foreground md:text-xl dark:text-muted-foreground-dark">
								We&apos;re here to help. If you have any questions or issues, please don&apos;t
								hesitate to contact us.
							</p>
						</div>
					</div>
				</div>
			</section>
			<section className="w-full py-12 md:py-24 lg:py-32">
				<div className="container px-4 md:px-6">
					<div className="mx-auto max-w-[600px]">
						<form
							action={async (formData) => {
								'use server';
								const result = await acceptSupport(
									formData.get('name') as string,
									formData.get('email') as string,
									formData.get('message') as string
								);
								if (result) {
									redirect('/support?success=true');
								} else {
									redirect('/support?success=false');
								}
							}}
							className="space-y-4"
						>
							<div>
								<label
									htmlFor="name"
									className="block text-sm font-medium text-muted-foreground dark:text-muted-foreground-dark"
								>
									Name
								</label>
								<Input
									id="name"
									name="name"
									placeholder="Your name"
									required
									className="border-muted-foreground dark:border-muted-foreground-dark"
								/>
							</div>
							<div>
								<label
									htmlFor="email"
									className="block text-sm font-medium text-muted-foreground dark:text-muted-foreground-dark"
								>
									Email
								</label>
								<Input
									id="email"
									name="email"
									placeholder="Your email"
									type="email"
									required
									className="border-muted-foreground dark:border-muted-foreground-dark"
								/>
							</div>
							<div>
								<label
									htmlFor="message"
									className="block text-sm font-medium text-muted-foreground dark:text-muted-foreground-dark"
								>
									Message
								</label>
								<Textarea
									id="message"
									name="message"
									placeholder="Your message"
									required
									className="border-muted-foreground dark:border-muted-foreground-dark"
								/>
							</div>
							<div className="flex items-center justify-center">
								<CustomButton className="bg-primary text-foreground text-white dark:text-black dark:bg-primary-dark">
									Send Message
								</CustomButton>
							</div>
						</form>
					</div>
				</div>
			</section>
		</main>
	);
}
