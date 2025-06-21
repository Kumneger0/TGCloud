export const dynamic = 'force-static';
export const dynamicParams = false;

export default function TermsPage() {
	return (
		<main className="flex-1">
			<section className="w-full py-12 md:py-24 lg:py-32">
				<div className="container px-4 md:px-6">
					<div className="flex flex-col items-center space-y-4 text-center">
						<div className="space-y-2">
							<h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
								Terms of Service
							</h1>
						</div>
					</div>
				</div>
			</section>
			<section className="w-full py-12 md:py-24 lg:py-32">
				<div className="container px-4 md:px-6">
					<div className="mx-auto max-w-[800px] space-y-8">
						<h2 className="text-2xl font-bold">1. Service Description</h2>
						<p>
							TGCloud provides unlimited cloud storage services utilizing Telegram&apos;s
							infrastructure.
						</p>

						<h2 className="text-2xl font-bold">2. User Responsibilities</h2>
						<p>
							Users are responsible for maintaining the confidentiality of their account information
							and for all activities that occur under their account.
						</p>

						<h2 className="text-2xl font-bold">3. Telegram Account Access</h2>
						<p>
							By using our service, you grant TGCloud access to your Telegram account session. This
							access allows us to create and manage a private channel for your file storage. We want
							to be transparent: this level of access theoretically allows us to access your
							Telegram account. However, we assure you that we do not access any part of your
							Telegram account beyond what&apos;s necessary for our storage service. If you&apos;re
							uncomfortable with this level of access, we recommend not using our service. Your
							trust and privacy are paramount to us.
						</p>

						<h2 className="text-2xl font-bold">4. Prohibited Content</h2>
						<p>
							Users are prohibited from storing any illegal or harmful content using our service.
						</p>

						<h2 className="text-2xl font-bold">5. Service Modifications</h2>
						<p>We reserve the right to modify or discontinue the service at any time.</p>

						<h2 className="text-2xl font-bold">6. Limitation of Liability</h2>
						<p>
							TGCloud is not liable for any indirect, incidental, special, consequential or punitive
							damages.
						</p>
					</div>
				</div>
			</section>
		</main>
	);
}
