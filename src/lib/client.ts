import { oneTapClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const client = createAuthClient({
	plugins: [
		oneTapClient({
			clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
		})
	]
});
