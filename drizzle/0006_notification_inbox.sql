ALTER TABLE "alert_event" ADD COLUMN "title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_event" ADD COLUMN "body" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_event" ADD COLUMN "url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_event" ADD COLUMN "read_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "alert_event_user_created_idx" ON "alert_event" USING btree ("user_id","created_at");