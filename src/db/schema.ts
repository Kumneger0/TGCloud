import {
	bigint,
	boolean,
	date,
	foreignKey,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { env } from '@/env';
import { relations } from 'drizzle-orm';

export const planEnum = pgEnum('plan', ['ANNUAL', 'MONTHLY']);
export const authTypeEnum = pgEnum('authType', ['user', 'bot']);

export const usersTable = pgTable(
	'usersTable',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		email: text('email').notNull().unique(),
		imageUrl: text('imageUrl'),
		channelUsername: text('channelName').unique(),
		channelId: text('channelId').unique(),
		accessHash: text('accessHash'),
		channelTitle: text('channelTitle'),
		hasPublicTgChannel: boolean('hasPublicChannel'),
		isSubscribedToPro: boolean('is_subscribed_to_pro').default(false),
		subscriptionDate: date('subscription_date'),
		plan: planEnum('plan'),
		emailVerified: boolean('emailVerified'),
		image: text('image'),
		createdAt: timestamp('createdAt', { mode: 'string' }).$defaultFn(() =>
			new Date().toDateString()
		),
		authType: authTypeEnum('authType').notNull().default('user'),
		updatedAt: timestamp('updatedAt', { mode: 'string' }).$defaultFn(() =>
			new Date().toDateString()
		)
	},
	(table) => ({
		emailIdx: uniqueIndex('email_idx').on(table.email)
	})
);

export const usersRelations = relations(usersTable, ({ many }) => ({
	botTokens: many(botTokens)
}));

export const botTokens = pgTable('botTokens', {
	id: text('id').primaryKey(),
	token: text('token').notNull().default(env.NEXT_PUBLIC_BOT_TOKEN),
	userId: text('userId')
		.notNull()
		.references(() => usersTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	rateLimitedUntil: timestamp('rateLimitedUntil'),
	createdAt: timestamp('createdAt', { mode: 'string' }).$defaultFn(() => new Date().toDateString()),
	updatedAt: timestamp('updatedAt', { mode: 'string' }).$defaultFn(() => new Date().toDateString())
});

export const botTokenRelations = relations(botTokens, ({ one }) => ({
	user: one(usersTable, {
		fields: [botTokens.userId],
		references: [usersTable.id]
	})
}));

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: date('expiresAt'),
		ipAddress: text('ipAddress'),
		token: text('token'),
		userAgent: text('userAgent'),
		userId: text('userId'),
		createdAt: text('createdAt'),
		updatedAt: text('updatedAt')
	},
	(table) => ({
		fkUserId: foreignKey({
			columns: [table.userId],
			foreignColumns: [usersTable.id]
		}).onDelete('cascade')
	})
);

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('accountId'),
		providerId: text('providerId'),
		userId: text('userId'),
		accessToken: text('accessToken'),
		refreshToken: text('refreshToken'),
		idToken: text('idToken'),
		expiresAt: date('expiresAt'),
		password: text('password'),
		createdAt: text('createdAt'),
		updatedAt: text('updatedAt'),
		accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
		refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
		scope: text('scope')
	},
	(table) => ({
		fkUserId: foreignKey({
			columns: [table.userId],
			foreignColumns: [usersTable.id]
		}).onDelete('cascade')
	})
);

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier'),
	value: text('value'),
	expiresAt: date('expiresAt'),
	createdAt: date('createdAt'),
	updatedAt: date('updatedAt')
});

export const sharedFilesTable = pgTable(
	'sharedFiles',
	{
		id: text('id').primaryKey(),
		fileId: text('fileId'),
		userId: text('userId').notNull()
	},
	(table) => ({
		fkUserId: foreignKey({
			columns: [table.userId],
			foreignColumns: [usersTable.id]
		})
			.onUpdate('cascade')
			.onDelete('cascade')
	})
);

export const paymentsTable = pgTable(
	'paymentsTable',
	{
		id: text('id').primaryKey(),
		amount: text('amount').notNull(),
		currency: text('currency').notNull(),
		userId: text('userId').notNull(),
		tx_ref: text('tx_ref').notNull().unique(),
		customizationTitle: text('customizationTitle'),
		customizationDescription: text('customizationDescription'),
		customizationLogo: text('customizationLogo'),
		paymentDate: date('paymentDate').$defaultFn(() => new Date().toISOString()),
		isPaymentDONE: boolean('isPaymentDONE').default(false),
		plan: planEnum('plan')
	},
	(table) => ({
		fkUserId: foreignKey({
			columns: [table.userId],
			foreignColumns: [usersTable.id]
		})
			.onUpdate('cascade')
			.onDelete('cascade')
	})
);

export const folders = pgTable(
	'folders',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		userId: text('userId').notNull(),
		parentId: text('parentId'),
		path: text('path').notNull(),
		createdAt: date('createdAt', { mode: 'string' }).$defaultFn(() => new Date().toDateString()),
		updatedAt: date('updatedAt', { mode: 'string' }).$defaultFn(() => new Date().toDateString())
	},
	(table) => ({
		userFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [usersTable.id]
		})
			.onDelete('cascade')
			.onUpdate('cascade'),
		parentFk: foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id]
		})
			.onDelete('cascade')
			.onUpdate('cascade')
	})
);

export const userFiles = pgTable(
	'userFiles',
	{
		id: bigint('id', { mode: 'number' }).primaryKey(),
		userId: text('userId').notNull(),
		folderId: text('folderId'),
		fileName: text('filename').notNull(),
		mimeType: text('mimeType').notNull(),
		size: bigint('size', { mode: 'bigint' }).notNull(),
		url: text('fileUrl').notNull(),
		date: date('date', { mode: 'string' }).$defaultFn(() => new Date().toDateString()),
		fileTelegramId: text('fileTelegramId'),
		category: text('fileCategory'),
		createdAt: date('createdAt', { mode: 'string' }).$defaultFn(() => new Date().toDateString()),
		updatedAt: date('updatedAt', { mode: 'string' }).$defaultFn(() => new Date().toDateString())
	},
	(table) => ({
		userFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [usersTable.id]
		})
			.onDelete('cascade')
			.onUpdate('cascade'),
		folderFk: foreignKey({
			columns: [table.folderId],
			foreignColumns: [folders.id]
		})
			.onDelete('cascade')
			.onUpdate('cascade')
	})
);

export const supportTable = pgTable('supportTable', {
	id: bigint('id', { mode: 'number' }).primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull(),
	message: text('message').notNull(),
	date: date('date', { mode: 'string' }).$defaultFn(() => new Date().toDateString())
});
