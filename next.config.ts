import { withSentryConfig } from '@sentry/nextjs';

import { NextConfig } from 'next';
const nextConfig: NextConfig = {
	turbopack: {
		resolveAlias: {
			fs: {
				browser: './src/lib/empty.ts'
			},
			net: {
				browser: './src/lib/empty.ts'
			}
		}
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'via.placeholder.com',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'img.freepik.com',
				port: ''
			},
			{
				hostname: 'api.dicebear.com',
				protocol: 'https',
				port: ''
			}
		]
	},
	compiler: {
		removeConsole: process.env.NODE_ENV === 'production' ? {
			exclude: ['error']
		} : false
	},
	experimental: {
		optimizePackageImports: ['telegram', 'posthog-js', '@sentry/nextjs'],
		typedEnv: true
	},
	webpack: (config, { isServer }) => {
		if (isServer) {
			return config;
		}

		config.resolve.fallback = { fs: false, net: false, async_hooks: false };
		return config;
	}
};

export default withSentryConfig(nextConfig, {
	org: 'kumneger-cg',
	project: 'tg-cloud',
	silent: !process.env.CI,
	widenClientFileUpload: true,
	hideSourceMaps: true,
	disableLogger: true,
	automaticVercelMonitors: true
});
