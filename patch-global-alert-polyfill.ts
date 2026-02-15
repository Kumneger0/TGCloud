'use client';

import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
	window.alert = (message: any) => {
		console.warn(message);
	};
}
