import Link from 'next/link';

export const dynamic = 'force-static';
export const dynamicParams = false;

export default function PrivacyPage() {
	return (
		<main className="flex-1">
			<section className="w-full py-12 md:py-24 lg:py-32">
				<div className="container px-4 md:px-6">
					<div className="flex flex-col items-center space-y-4 text-center">
						<div className="space-y-2">
							<h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
								Privacy Policy
							</h1>
						</div>
					</div>
				</div>
			</section>
			<section className="w-full py-12 md:py-24 lg:py-32">
				<div className="container px-4 md:px-6">
					<div className="mx-auto max-w-[800px] space-y-8">
						<h2 className="text-2xl font-bold">1. Information We Collect</h2>
						<p>
							We collect information you provide directly to us, such as when you create an account,
							use our services, or contact us for support.
						</p>

						<h2 className="text-2xl font-bold">2. How We Use Your Information</h2>
						<p>
							We use the information we collect to provide, maintain, and improve our services, to
							communicate with you, and to comply with legal obligations.
						</p>

						<h2 className="text-2xl font-bold">3. Information Sharing and Disclosure</h2>
						<p>
							We do not share your personal information with third parties except as described in
							this policy or with your consent.
						</p>

						<h2 className="text-2xl font-bold">4. Data Security</h2>
						<p>
							We take reasonable measures to help protect your personal information from loss,
							theft, misuse, unauthorized access, disclosure, alteration, and destruction.
						</p>

						<h2 className="text-2xl font-bold">5. Your Rights</h2>
						<p>
							You have the right to access, correct, or delete your personal information. You can do
							this through your account settings or by contacting us.
						</p>

						<h2 className="text-2xl font-bold">6. Changes to This Policy</h2>
						<p>
							We may update this privacy policy from time to time. We will notify you of any changes
							by posting the new privacy policy on this page.
						</p>

						<h2 className="text-2xl font-bold">7. Contact Us</h2>
						<p>
							If you have any questions about this privacy policy, please contact us at{' '}
							<Link prefetch={false} href="mailto:fleag@tgcloud.app">
								fleag@tgcloud.app
							</Link>
						</p>
					</div>
				</div>
			</section>
		</main>
	);
}
