'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

function CustomLInk({
	children,
	href,
	...props
}: {
	children: React.ReactNode;
	href: string;
} & React.ComponentPropsWithoutRef<typeof Link>) {
	const router = useRouter();

	return (
		<Link
			onMouseOver={() => {
				if (!href.startsWith('/')) return;
				router.prefetch(href);
			}}
			{...props}
			href={href}
			prefetch={false}
		>
			{children}
		</Link>
	);
}

export default CustomLInk;
