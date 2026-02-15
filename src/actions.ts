'use server';
import Email from '@/components/email';
import { auth } from '@/lib/auth';
import { and, asc, count, desc, eq, ilike, isNull } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'node:crypto';
import React from 'react';
import { Resend } from 'resend';
import { db } from './db';
import {
	botTokens,
	folders as foldersTable,
	sharedFilesTable,
	userFiles,
	usersTable
} from './db/schema';
import { env } from './env';
import { User } from './lib/types';

export type FolderHierarchy = {
	id: string;
	name: string;
	path: string;
	parentId: string | null;
	children: FolderHierarchy[];
};

export async function getAllFolders(userId: string) {
	const allFolders = await db
		.select()
		.from(foldersTable)
		.where(eq(foldersTable.userId, userId))
		.orderBy(asc(foldersTable.name))
		.execute();

	return allFolders;
}

export async function getFolderHierarchy(userId: string): Promise<FolderHierarchy[]> {
	const allFolders = await db
		.select()
		.from(foldersTable)
		.where(eq(foldersTable.userId, userId))
		.orderBy(asc(foldersTable.name))
		.execute();

	const folderMap = new Map(allFolders.map((folder) => [folder.id, { ...folder, children: [] }]));
	const rootFolders: FolderHierarchy[] = [];

	allFolders.forEach((folder) => {
		const folderWithChildren = folderMap.get(folder.id)!;

		if (!folder.parentId) {
			rootFolders.push(folderWithChildren);
		} else {
			const parent = folderMap.get(folder.parentId);
			if (parent) {
				(parent.children as FolderHierarchy[]).push(folderWithChildren);
			}
		}
	});

	return rootFolders;
}

export async function updateTokenRateLimit(tokenId: string, millisec: number) {
	try {
		const retryAfter = new Date(Date.now() + millisec);
		const updateResult = await db
			.update(botTokens)
			.set({
				rateLimitedUntil: retryAfter
			})
			.where(eq(botTokens.id, tokenId))
			.returning();
		return updateResult;
	} catch (error) {
		console.error('Error updating token rate limit:', error);
	}
}

export async function deleteToken(tokenId: string) {
	try {
		await db.delete(botTokens).where(eq(botTokens.id, tokenId));
	} catch (error) {
		console.error('Error deleting token:', error);
	}
}
export async function addToken(token: string) {
	try {
		const user = await getUser();
		if (!user?.id) {
			throw new Error('user needs to be logged in.');
		}
		await db.insert(botTokens).values({
			id: crypto.randomUUID(),
			token: token,
			userId: user?.id
		});
	} catch (error) {
		console.error('Error adding token:', error);
	}
}

type SaveTelegramCredentialsArgs =
	| {
			session: string;
			accessHash: string;
			channelId: string;
			channelTitle: string;
			authType: 'user';
	  }
	| {
			accessHash: string;
			channelId: string;
			channelTitle: string;
			botToken?: string;
			authType: 'bot';
	  };

export async function saveTelegramCredentials(options: SaveTelegramCredentialsArgs) {
	if (options.authType === 'user' && !options.session) {
		throw new Error('Session is required ');
	}

	if (options.authType === 'user') {
		(await cookies()).set('telegramSession', options.session, {
			maxAge: 60 * 60 * 24 * 365,
			httpOnly: true,
			secure: true
		});
	}

	const user = await getUser();

	if (!user?.id) {
		throw new Error('user needs to be logged in.');
	}
	try {
		await db.update(usersTable).set({
			authType: options.authType
		}).where(eq(usersTable.id, user.id));

		if (options.authType === 'bot') {
			await db.insert(botTokens).values({
				id: crypto.randomUUID(),
				userId: user?.id,
				token: options.botToken
			});
		}
		const result = await db 
			.update(usersTable)
			.set({
				accessHash: options.accessHash,
				channelId: options.channelId,
				channelTitle: options.channelTitle
			})
			.where(eq(usersTable.id, user.id))
			.returning();
		return result;
	} catch (error) {
		console.error('Error while saving Telegram credentials:', error);
		throw new Error('There was an error while saving Telegram credentials.');
	}
}

export const saveUserName = async (username: string) => {
	const user = await getUser();
	if (!user || !user.id) {
		throw new Error('user needs to be logged in.');
	}
	try {
		const result = await db
			.update(usersTable)
			.set({
				channelUsername: username
			})
			.where(eq(usersTable.id, user.id))
			.returning();
		return result;
	} catch (error) {
		console.error('Error while saving Telegram credentials:', error);
		throw new Error('There was an error while saving Telegram credentials.');
	}
};

export async function getUser() {
	const session = await auth.api.getSession({
		headers: await headers()
	});

	if (!session) return null;
	const user = session.user;

	try {
		const result = await db.query.usersTable.findFirst({
			where(fields, { eq }) {
				return eq(fields.id, user.id);
			},
			with: {
				botTokens: true
			}
		});
		return result;
	} catch (err) {
		if (err instanceof Error) throw new Error(err.message);
		throw new Error('There was an error while getting user');
	}
}

export async function getAllFiles(searchItem?: string, offset?: number, folderId?: string | null) {
	try {
		const user = await getUser();
		if (!user || !user.id) {
			throw new Error('User not authenticated or user ID is missing');
		}

		const baseWhere = folderId
			? and(eq(userFiles.userId, user.id), eq(userFiles.folderId, folderId))
			: and(eq(userFiles.userId, user.id), isNull(userFiles.folderId));

		if (searchItem) {
			const results = await db
				.select()
				.from(userFiles)
				.where(and(baseWhere, ilike(userFiles.fileName, `%${searchItem}%`)))
				.orderBy(asc(userFiles.id))
				.limit(8)
				.offset(offset ?? 0)
				.execute();

			const total = (
				await db
					.select({ count: count() })
					.from(userFiles)
					.where(and(baseWhere, ilike(userFiles.fileName, `%${searchItem}%`)))
					.execute()
			)[0].count;

			return [results, total];
		}

		const results = await db
			.select()
			.from(userFiles)
			.where(baseWhere)
			.orderBy(asc(userFiles.id))
			.limit(8)
			.offset(offset ?? 0)
			.execute();

		const total = (
			await db.select({ count: count() }).from(userFiles).where(baseWhere).execute()
		)[0].count;

		return [results, total];
	} catch (err) {
		if (err instanceof Error) {
			console.error('Error fetching files:', err.message);
			throw new Error('Failed to fetch files. Please try again later.');
		}
	}
}

export async function getFolderContents(
	folderId: string | null,
	searchItem?: string,
	offset?: number,
	fileType?: string
) {
	try {
		const user = await getUser();
		if (!user || !user.id) {
			throw new Error('User not authenticated or user ID is missing');
		}

		const folders = await db
			.select()
			.from(foldersTable)
			.where(
				and(
					eq(foldersTable.userId, user.id),
					folderId ? eq(foldersTable.parentId, folderId) : isNull(foldersTable.parentId)
				)
			)
			.orderBy(asc(foldersTable.name))
			.execute();
		if (fileType) {
			const filesResult = await getFilesFromSpecificType({
				fileType,
				searchItem,
				offset,
				folderId
			});
			if (!filesResult) return null;

			const [files, totalFiles] = filesResult;
			return {
				folders,
				files,
				totalFiles: totalFiles as number
			};
		} else {
			const filesResult = await getAllFiles(searchItem, offset, folderId);
			if (!filesResult) return null;

			const [files, totalFiles] = filesResult;

			return {
				folders,
				files,
				totalFiles: totalFiles as number
			};
		}
	} catch (err) {
		if (err instanceof Error) {
			console.error('Error fetching folder contents:', err.message);
			throw new Error('Failed to fetch folder contents. Please try again later.');
		}
	}
}

export async function getFilesFromSpecificType({
	fileType,
	searchItem,
	offset,
	folderId
}: {
	searchItem?: string;
	fileType: string;
	offset?: number;
	folderId?: string | null;
}) {
	try {
		const user = await getUser();
		if (!user || !user.id) {
			throw new Error('User not authenticated or user ID is missing');
		}
		const baseWhere = folderId
			? and(eq(userFiles.userId, user.id), eq(userFiles.folderId, folderId))
			: and(eq(userFiles.userId, user.id), isNull(userFiles.folderId));

		if (searchItem) {
			const results = await db
				.select()
				.from(userFiles)
				.where(
					and(
						baseWhere,
						ilike(userFiles.fileName, `%${searchItem}%`),
						eq(userFiles.category, fileType),
						eq(userFiles.userId, user.id)
					)
				)
				.orderBy(asc(userFiles.id))
				.limit(8)
				.offset(offset ?? 0)
				.execute();

			const total = (
				await db
					.select({ count: count() })
					.from(userFiles)
					.where(
						and(
							baseWhere,
							ilike(userFiles.fileName, `%${searchItem}%`),
							eq(userFiles.category, fileType),
							eq(userFiles.userId, user.id)
						)
					)
					.execute()
			)[0].count;

			return [results, total];
		}

		const results = await db
			.select()
			.from(userFiles)
			.where(and(baseWhere, eq(userFiles.category, fileType), eq(userFiles.userId, user.id)))
			.orderBy(asc(userFiles.id))
			.limit(8)
			.offset(offset ?? 0)
			.execute();

		const total = (
			await db
				.select({ count: count() })
				.from(userFiles)
				.where(and(baseWhere, and(eq(userFiles.category, fileType), eq(userFiles.userId, user.id))))
				.execute()
		)[0].count;

		return [results, total];
	} catch (err) {
		if (err instanceof Error) {
			console.error('Error fetching files:', err.message);
			throw new Error('Failed to fetch files. Please try again later.');
		}
	}
}

export async function createFolder(name: string, parentId: string | null) {
	const user = await getUser();
	if (!user || !user.id) {
		throw new Error('User not authenticated');
	}

	let parentPath = '';
	if (parentId) {
		const parentFolder = await db
			.select()
			.from(foldersTable)
			.where(eq(foldersTable.id, parentId))
			.limit(1)
			.execute();

		if (parentFolder.length > 0) {
			parentPath = parentFolder[0].path;
		}
	}

	const folderId = crypto.randomUUID();
	const path = parentPath ? `${parentPath}/${name}` : `/${name}`;

	await db.insert(foldersTable).values({
		id: folderId,
		name,
		userId: user.id,
		parentId,
		path
	});
	revalidateTag('get-folder', 'max');
	return folderId;
}

export async function uploadFile(file: {
	fileName: string;
	mimeType: string;
	size: bigint;
	url: string;
	fileTelegramId: number;
	folderId: string | null;
}) {
	try {
		const user = await getUser();
		if (!user || !user.id) {
			throw new Error('User not authenticated or user ID is missing');
		}

		const result = await db
			.insert(userFiles)
			.values({
				id: await generateId(),
				userId: user.id,
				fileName: file.fileName,
				mimeType: file.mimeType,
				size: file.size,
				url: file.url,
				date: new Date().toDateString(),
				fileTelegramId: String(file.fileTelegramId),
				category: file?.mimeType?.split('/')[0],
				folderId: file?.folderId
			})
			.returning();
		revalidatePath('/files');
		return result;
	} catch (err) {
		if (err instanceof Error) {
			console.error('Error uploading file:', err?.message);
			throw new Error('Failed to upload file. Please try again later.');
		}
	} finally {
	}
}

export async function deleteFile(fileId: number) {
	try {
		const user = await getUser();
		if (!user || !user.id) throw new Error('you need to be logged to delete files');
		const deletedFile = await db
			.delete(userFiles)
			.where(and(eq(userFiles.userId, user.id), eq(userFiles.id, Number(fileId))))
			.returning();
		return deletedFile;
	} catch (err) {
		if (err instanceof Error) {
			throw new Error(err.message);
		}
	}
}

async function generateId() {
	const result = await db.select().from(userFiles).orderBy(desc(userFiles.id)).limit(1);

	const latestRecord = result[0];
	const newId = latestRecord ? latestRecord.id + 1 : 1;
	return newId;
}

export const requireUserAuthentication = async () => {
	const user = await getUser();
	const hasNotHaveNeccessaryDetails = !user?.accessHash || !user?.channelId;

	if (hasNotHaveNeccessaryDetails) return redirect('/connect-telegram');

	if (!user.channelUsername && (!user.channelId || !user.accessHash))
		throw new Error('There was something wrong');

	return user;
};

export const updateHasPublicChannelStatus = async (isPublic: boolean) => {
	try {
		const user = await getUser();
		if (!user || !user.id)
			throw new Error('Seems lke you are not authenticated', {
				cause: 'AUTH_ERR'
			});
		await db
			.update(usersTable)
			.set({ hasPublicTgChannel: isPublic })
			.where(eq(usersTable.id, user.id))
			.returning();
		return user.id;
	} catch (err) {
		if (err instanceof Error) throw new Error(err.message);
	}
	throw new Error('There was an error while updating status');
};

function addDays(date: Date, days: number): Date {
	const newDate = new Date(date);
	newDate.setDate(newDate.getDate() + days);
	return newDate;
}

type PeymentResult = Awaited<ReturnType<typeof db.query.paymentsTable.findFirst>>;

type UserPaymentSubscriptionResult =
	| {
			isDone: true;
			data: PeymentResult;
			status: 'success';
	  }
	| {
			isDone: false;
			status: 'failed';
			message: string;
			data?: PeymentResult;
	  };

// export async function subscribeToPro({
// 	tx_ref
// }: {
// 	tx_ref: string;
// }): Promise<UserPaymentSubscriptionResult> {
// 	try {
// 		const otherSubscriptionWithThisTxRef = await db.query.paymentsTable.findFirst({
// 			where(fields, { eq, and }) {
// 				return eq(fields.tx_ref, tx_ref);
// 			}
// 		});

// 		if (otherSubscriptionWithThisTxRef?.isPaymentDONE)
// 			return {
// 				isDone: false,
// 				data: otherSubscriptionWithThisTxRef,
// 				status: 'failed',
// 				message: 'payment already made before'
// 			};

// 		const data = await verifyPayment({ tx_ref });

// 		if (data.status !== 'success') throw new Error(data.message);

// 		const user = await getUser();
// 		if (!user || !user.id) throw new Error('Failed to get user');

// 		let currentExpirationDate = user.subscriptionDate
// 			? new Date(user.subscriptionDate)
// 			: new Date();
// 		if (currentExpirationDate < new Date()) {
// 			currentExpirationDate = new Date();
// 		}

// 		const plan = otherSubscriptionWithThisTxRef?.plan;

// 		if (!plan) throw new Error('FAILED GET UR PAYMENT INFORAMITON PELEASE PLACT SUPPORT CENTER');

// 		const newExpirationDate = addDays(
// 			currentExpirationDate,
// 			plan == 'ANNUAL' ? 365 : 30
// 		).toISOString();

// 		const result = await db
// 			.update(usersTable)
// 			.set({
// 				isSubscribedToPro: true,
// 				subscriptionDate: newExpirationDate,
// 				plan: plan
// 			})
// 			.where(eq(usersTable.id, user.id))
// 			.returning();

// 		await db
// 			.update(paymentsTable)
// 			.set({
// 				isPaymentDONE: true
// 			})
// 			.where(eq(paymentsTable.tx_ref, tx_ref))
// 			.returning()
// 			.execute();

// 		sendEmail(user, newExpirationDate);

// 		return {
// 			isDone: true,
// 			data: otherSubscriptionWithThisTxRef,
// 			status: 'success'
// 		};
// 	} catch (err) {
// 		return {
// 			isDone: false,
// 			message: 'there was an error while proccessin payment',
// 			status: 'failed'
// 		};
// 	}
// }

async function sendEmail(user: Partial<User>, expirationDate: string) {
	const resend = new Resend(env.RESEND_API_KEY);
	await resend.emails.send({
		from: 'onboarding@resend.dev',
		to: user?.email!,
		subject: 'Pro Activated',
		react: React.createElement(Email, {
			expirationDate,
			userName: user?.name!
		})
	});
}

// export async function initailizePayment({
// 	amount,
// 	currency,
// 	plan
// }: {
// 	amount: string;
// 	currency: string;
// 	plan: PLANS;
// }) {
// 	try {
// 		const user = await getUser();

// 		if (!user || !user.id) throw new Error('user needs to be loggedin');

// 		const tx_ref = crypto.randomUUID();

// 		const body: ChapaInitializePaymentRequestBody = {
// 			amount,
// 			currency,
// 			email: user.email!,
// 			first_name: user.name!,
// 			tx_ref,
// 			return_url: `https://tgcloud-k.vercel.app/subscribe/success/${tx_ref}`
// 		};

// 		await db
// 			.insert(paymentsTable)
// 			.values({
// 				id: crypto.randomUUID(),
// 				amount: amount,
// 				currency: currency,
// 				userId: user.id,
// 				tx_ref,
// 				isPaymentDONE: false,
// 				plan: plan
// 			})
// 			.returning()
// 			.execute();

// 		const response = await fetch('https://api.chapa.co/v1/transaction/initialize', {
// 			method: 'post',
// 			headers: {
// 				Authorization: `Bearer ${env.CHAPA_API_KEY}`,
// 				'Content-Type': 'application/json'
// 			},
// 			body: JSON.stringify(body)
// 		});

// 		const data = (await response.json()) as {
// 			message: string;
// 			status: string;
// 			data: {
// 				checkout_url: string;
// 			};
// 		};

// 		return data;
// 	} catch (err) {
// 		console.error(err);
// 		throw err;
// 	}
// }

// async function verifyPayment({ tx_ref }: { tx_ref: string }) {
// 	const response = await fetch(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
// 		method: 'get',
// 		headers: {
// 			Authorization: `Bearer ${env.CHAPA_API_KEY}`
// 		}
// 	});
// 	const result = (await response.json()) as {
// 		message: string;
// 		status: string;
// 		data: ChapaInitializePaymentRequestBody;
// 	};
// 	return result;
// }

export async function shareFile({ fileID }: { fileID: string }) {
	try {
		const user = await getUser();
		if (!user?.id) throw new Error('you need to be singed in to share ur files');
		const newShare = await db
			.insert(sharedFilesTable)
			.values({
				id: crypto.randomUUID(),
				userId: user?.id,
				fileId: fileID
			})
			.returning()
			.execute();
		return newShare;
	} catch (err) {
		console.error(err);
	}
}

export async function getSharedFiles(id: string) {
	try {
		const result = await db
			.select()
			.from(sharedFilesTable)
			.leftJoin(
				usersTable,
				and(eq(usersTable.id, sharedFilesTable.userId), eq(sharedFilesTable.id, id))
			)
			.where(and(eq(usersTable.id, sharedFilesTable.userId), eq(sharedFilesTable.id, id)));

		return result;
	} catch (err) {
		console.error(err);
	}
}

export const clearCookies = async () => {
	try {
		(await cookies()).delete('telegramSession');
		redirect('/connect-telegram');
	} catch (err) {
		console.error(err);
		return null;
	}
};

export const deleteChannelDetail = async () => {
	// try {
	const user = await getUser();
	if (!user?.id) throw new Error('Failed to get user');
	const updateTable = await db
		.update(usersTable)
		.set({
			channelId: null,
			accessHash: null,
			channelTitle: null
		})
		.where(eq(usersTable.id, user?.id));
	redirect('/connect-telegram');
	// } catch (err) {
	// console.error(err);
	// }
};
