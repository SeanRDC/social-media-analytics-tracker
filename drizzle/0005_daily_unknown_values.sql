ALTER TABLE "daily_stat" ALTER COLUMN "followers" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_stat" ALTER COLUMN "followers_gained" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "daily_stat" ALTER COLUMN "followers_gained" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_stat" ALTER COLUMN "views" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "daily_stat" ALTER COLUMN "views" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_stat" ALTER COLUMN "engagements" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "daily_stat" ALTER COLUMN "engagements" DROP NOT NULL;--> statement-breakpoint
-- The first stored day of a totals-only platform (TikTok, Instagram) had no earlier
-- sync to compare against, so its views, engagement and follower change were never
-- known; they were stored as 0. Clear them; the follower total itself was read directly.
UPDATE "daily_stat" AS d SET "views" = NULL, "engagements" = NULL, "followers_gained" = NULL
FROM "connection" AS c
WHERE d."connection_id" = c."id"
  AND c."platform" IN ('tiktok', 'instagram')
  AND d."date" = (SELECT min(x."date") FROM "daily_stat" AS x WHERE x."connection_id" = d."connection_id");
