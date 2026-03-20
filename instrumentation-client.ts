import { env } from '@/env';
import posthog from 'posthog-js';

posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
	api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
	person_profiles: 'always'
});
