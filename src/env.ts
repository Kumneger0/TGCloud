import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
	server: {
		DATABASE_URL: z.string(),
		RESEND_API_KEY: z.string(),
		GOOGLE_CLIENT_SECRET: z.string(),
		GITHUB_CLIENT_SECRET: z.string(),
		supportMail: z.string().default('onboarding@resend.dev'),
		supportRecipients: z.string().default('kumnegerwondimu01@gmail.com')
	},
	client: {
		NEXT_PUBLIC_TELEGRAM_API_ID: z.string().transform((v) => parseInt(v)),
		NEXT_PUBLIC_TELEGRAM_API_HASH: z.string(),
		NEXT_PUBLIC_SENTRY_AUTH_TOKEN: z.string(),
		NEXT_PUBLIC_POSTHOG_HOST: z.string(),
		NEXT_PUBLIC_POSTHOG_KEY: z.string(),
		NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string(),
		NEXT_PUBLIC_GITHUB_CLIENT_ID: z.string(),
	},
	runtimeEnv: {
		RESEND_API_KEY: process.env.RESEND_API_KEY,
		DATABASE_URL: process.env.DATABASE_URL,
		NEXT_PUBLIC_TELEGRAM_API_ID: process.env.NEXT_PUBLIC_TELEGRAM_API_ID,
		NEXT_PUBLIC_TELEGRAM_API_HASH: process.env.NEXT_PUBLIC_TELEGRAM_API_HASH,
		NEXT_PUBLIC_SENTRY_AUTH_TOKEN: process.env.NEXT_PUBLIC_SENTRY_AUTH_TOKEN,
		NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
		NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
		GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
		GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
		NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
		NEXT_PUBLIC_GITHUB_CLIENT_ID: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
		supportMail: process.env.supportMail,
		supportRecipients: process.env.supportRecipients,
	}
});
