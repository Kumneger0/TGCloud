'use client';
import { User } from '@/lib/types';
import Image from 'next/image';
import { useEffect, useState } from 'react';

function SharedFile({
	user,
	fileID
}: {
	user: Omit<User, 'telegramSession' | 'botTokens'>;
	fileID: string;
}) {
	const [url, setURL] = useState('');

	useEffect(() => {
		if (!user) {
			throw new Error('Failed to get user');
		}

		if (!fileID) {
			throw new Error('Failed to get file ID');
		}

		//TODO:  implment sharing file in secure way
		// downloadMedia({
		// 	user,
		// 	messageId: fileID,
		// 	category: 'image',
		// 	size: 'large',
		// 	setURL,
		// 	isShare: true
		// });

		return () => {
			URL.revokeObjectURL(url as string);
		};
	}, [user, fileID, url]);

	return (
		<div className="w-full my-3 min-h-[100dvh] md:w-[600px] lg:w-[900px] mx-auto bg-white shadow-md rounded-lg overflow-hidden">
			<div className="flex items-center p-4 w-full">
				<img
					width={300}
					height={300}
					src={user?.imageUrl ?? `https://api.dicebear.com/9.x/initials/svg?seed=${user?.name}`}
					alt={user?.name ?? ''}
					className="w-12 h-12 rounded-full"
				/>
				<div className="ml-4">
					<p className="text-lg text-gray-600 font-semibold">Shared by {user?.name}</p>
				</div>
			</div>
			<div className="p-4">
				{url && (
					<Image
						width={1000}
						height={1000}
						src={url}
						alt="Shared file"
						className="w-full h-auto rounded-lg"
					/>
				)}
			</div>
		</div>
	);
}

export default SharedFile;
