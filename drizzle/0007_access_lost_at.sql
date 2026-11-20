ALTER TABLE "connection" ADD COLUMN "access_lost_at" timestamp with time zone;--> statement-breakpoint
-- Connections that had already lost access start their 7-day grace period now,
-- so nobody's data is deleted the moment this ships.
UPDATE "connection" SET "access_lost_at" = now() WHERE "status" = 'expired';
