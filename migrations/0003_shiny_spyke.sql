ALTER TABLE "botTokens" ALTER COLUMN "token" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "botTokens" ALTER COLUMN "token" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "usersTable" ALTER COLUMN "authType" SET DEFAULT 'bot';