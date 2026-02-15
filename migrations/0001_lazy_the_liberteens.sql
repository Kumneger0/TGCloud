DO $$ BEGIN
 CREATE TYPE "public"."authType" AS ENUM('user', 'bot');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DROP INDEX IF EXISTS "bot_token_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "channel_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "channel_username_idx";--> statement-breakpoint
ALTER TABLE "usersTable" ADD COLUMN "authType" "authType" DEFAULT 'user' NOT NULL;