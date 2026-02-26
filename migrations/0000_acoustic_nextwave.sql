DO $$ BEGIN
 CREATE TYPE "public"."plan" AS ENUM('ANNUAL', 'MONTHLY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text,
	"providerId" text,
	"userId" text,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"expiresAt" date,
	"password" text,
	"createdAt" text,
	"updatedAt" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "botTokens" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"userId" text NOT NULL,
	"rateLimitedUntil" timestamp,
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "folders" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"userId" text NOT NULL,
	"parentId" text,
	"path" text NOT NULL,
	"createdAt" date,
	"updatedAt" date
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "paymentsTable" (
	"id" text PRIMARY KEY NOT NULL,
	"amount" text NOT NULL,
	"currency" text NOT NULL,
	"userId" text NOT NULL,
	"tx_ref" text NOT NULL,
	"customizationTitle" text,
	"customizationDescription" text,
	"customizationLogo" text,
	"paymentDate" date,
	"isPaymentDONE" boolean DEFAULT false,
	"plan" "plan",
	CONSTRAINT "paymentsTable_tx_ref_unique" UNIQUE("tx_ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" date,
	"ipAddress" text,
	"token" text,
	"userAgent" text,
	"userId" text,
	"createdAt" text,
	"updatedAt" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sharedFiles" (
	"id" text PRIMARY KEY NOT NULL,
	"fileId" text,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supportTable" (
	"id" bigint PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"date" date
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userFiles" (
	"id" bigint PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"folderId" text,
	"filename" text NOT NULL,
	"mimeType" text NOT NULL,
	"size" bigint NOT NULL,
	"fileUrl" text NOT NULL,
	"date" date,
	"fileTelegramId" text,
	"fileCategory" text,
	"createdAt" date,
	"updatedAt" date
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usersTable" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"imageUrl" text,
	"channelName" text,
	"channelId" text,
	"accessHash" text,
	"channelTitle" text,
	"hasPublicChannel" boolean,
	"is_subscribed_to_pro" boolean DEFAULT false,
	"subscription_date" date,
	"plan" "plan",
	"emailVerified" boolean,
	"image" text,
	"createdAt" timestamp,
	"updatedAt" timestamp,
	CONSTRAINT "usersTable_email_unique" UNIQUE("email"),
	CONSTRAINT "usersTable_channelName_unique" UNIQUE("channelName"),
	CONSTRAINT "usersTable_channelId_unique" UNIQUE("channelId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text,
	"value" text,
	"expiresAt" date,
	"createdAt" date,
	"updatedAt" date
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account" ADD CONSTRAINT "account_userId_usersTable_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."usersTable"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "botTokens" ADD CONSTRAINT "botTokens_userId_usersTable_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."usersTable"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "folders" ADD CONSTRAINT "folders_userId_usersTable_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."usersTable"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "folders" ADD CONSTRAINT "folders_parentId_folders_id_fk" FOREIGN KEY ("parentId") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "paymentsTable" ADD CONSTRAINT "paymentsTable_userId_usersTable_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."usersTable"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_userId_usersTable_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."usersTable"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sharedFiles" ADD CONSTRAINT "sharedFiles_userId_usersTable_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."usersTable"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "userFiles" ADD CONSTRAINT "userFiles_userId_usersTable_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."usersTable"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "userFiles" ADD CONSTRAINT "userFiles_folderId_folders_id_fk" FOREIGN KEY ("folderId") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bot_token_idx" ON "botTokens" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_idx" ON "usersTable" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "channel_id_idx" ON "usersTable" USING btree ("channelId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "channel_username_idx" ON "usersTable" USING btree ("channelName");