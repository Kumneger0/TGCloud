'use server';
import { auth } from '@/lib/auth';
import { and, asc, count, desc, eq, ilike, inArray, isNull } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'node:crypto';
import { db } from './db';
import {
	botTokens,
	folders as foldersTable,
	sharedFilesTable,
	userFiles,
	usersTable
} from './db/schema';
import { USER_TELEGRAM_SESSION_COOKIE_NAME } from './lib/consts';
import { FileItem } from './lib/types';

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

export async function importSyncedFiles(files: Omit<FileItem, 'id' | 'userId' | 'category'>[]) {
	try {
		const user = await getUser();
		if (!user || !user.id) {
			throw new Error('User not authenticated or user ID is missing');
		}

		if (!Array.isArray(files) || files.length === 0) {
			return [];
		}

		const normalized = files
			.filter((f) => f && f.fileTelegramId)
			.map((f) => ({
				...f,
				fileTelegramId: String(f.fileTelegramId)
			}));

		if (normalized.length === 0) {
			return [];
		}

		const newFiles = new Set(await getNewTelegramIds(normalized.map((f) => f.fileTelegramId)))

		const uniqueToInsertMap = new Map<string, (typeof normalized)[number]>();
		normalized.forEach(f => {
			if (newFiles.has(f.fileTelegramId) && !uniqueToInsertMap.has(f.fileTelegramId)) {
				uniqueToInsertMap.set(f.fileTelegramId, f);
			}
		});
		const toInsert = Array.from(uniqueToInsertMap.values());

		if (toInsert.length === 0) {
			return [];
		}

		const result = await db
			.insert(userFiles)
			.values(
				toInsert.map((file) => {
					const mimeType = file.mimeType;
					return {
						userId: user.id,
						fileName: file.fileName,
						mimeType,
						size: file.size,
						url: file.url,
						date: file.date ?? new Date().toDateString(),
						fileTelegramId: String(file.fileTelegramId),
						category: mimeType.split('/')[0],
						folderId: file.folderId
					};
				})
			)
			.returning();

		revalidatePath('/files');
		return result;
	} catch (err) {
		if (err instanceof Error) {
			console.error('Error importing synced files:', err?.message);
			throw new Error('Failed to sync files. Please try again later.');
		}
		throw err;
	}
}

export async function getNewTelegramIds(telegramIds: string[]) {
	try {
		const user = await getUser();
		if (!user || !user.id) {
			throw new Error('User not authenticated or user ID is missing');
		}

		if (!Array.isArray(telegramIds) || telegramIds.length === 0) {
			return [];
		}

		const existing = await db
			.select({ fileTelegramId: userFiles.fileTelegramId })
			.from(userFiles)
			.where(
				and(
					eq(userFiles.userId, user.id),
					inArray(userFiles.fileTelegramId, telegramIds)
				)
			)
			.execute();

		const existingSet = new Set(existing.map((e) => e.fileTelegramId).filter(Boolean));
		return telegramIds.filter((id) => !existingSet.has(id));
	} catch (err) {
		console.error('Error checking for new telegram ids:', err);
		return telegramIds;
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
		(await cookies()).set(USER_TELEGRAM_SESSION_COOKIE_NAME, options.session, {
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

export async function switchOperationMode(newMode: 'user' | 'bot') {
	try {

		const user = await getUser();
		if (!user?.id) {
			throw new Error('User needs to be logged in.');
		}

		await db.update(usersTable)
			.set({ authType: newMode })
			.where(eq(usersTable.id, user.id));

		if (newMode == 'bot') {
			(await cookies()).delete(USER_TELEGRAM_SESSION_COOKIE_NAME);
		}
		revalidatePath('/');
		return { success: true };
	} catch (error) {
		console.error('Error switching operation mode:', error);
		throw new Error('Failed to switch operation mode.');
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
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		});

		if (!session) return null;
		const user = session.user;
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
		console.error(err)
		return null
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
	try {
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
	} catch (error) {
		console.error('Error creating folder:', error);
		if (error instanceof Error) throw error;
		throw new Error('Failed to create folder');
	}
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
export const requireUserAuthentication = async () => {
	const user = await getUser();
	if (!user) {
		redirect('/login')
	}

	const telegramSession = (await cookies()).get(USER_TELEGRAM_SESSION_COOKIE_NAME)?.value
	const authType = user.authType

	const hasNotHaveNeccessaryDetails = !user?.accessHash || !user?.channelId;

	const shouldGoToConnectTelegeramPage = (authType == 'user' && !telegramSession) || hasNotHaveNeccessaryDetails


	if (shouldGoToConnectTelegeramPage) return redirect('/connect-telegram');
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
		(await cookies()).delete(USER_TELEGRAM_SESSION_COOKIE_NAME);
		redirect('/connect-telegram');
	} catch (err) {
		console.error(err);
		return null;
	}
};

export const deleteChannelDetail = async () => {
	const user = await getUser();
	if (!user?.id) throw new Error('Failed to get user');
	return await db
		.update(usersTable)
		.set({
			channelId: null,
			accessHash: null,
			channelTitle: null
		})
		.where(eq(usersTable.id, user?.id)).returning();
};


export const clearUserFiles = async () => {
	try {
		const user = await getUser();
		if (!user?.id) throw new Error('Failed to get user');
		return await db.delete(userFiles).where(eq(userFiles.userId, user.id)).returning();
	} catch (err) {
		console.error(err);
		return null;
	}
};


export const clearFilesAndChannelDetails = async () => {
	try {
		const result = await Promise.all([
			clearUserFiles(),
			deleteChannelDetail()
		])
		const isSuccess = result.every((item) => item && item.length > 0);
		return isSuccess;
	} catch (err) {
		console.error(err);
		return null;
	}
};
