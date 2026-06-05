import { env } from '@/env';
import posthog from 'posthog-js';

posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
	capture_exceptions: true,
	api_host: 'https://tg-cloud.kumneger.dev',
	person_profiles: 'always',
	ui_host: 'https://us.posthog.com'
});



