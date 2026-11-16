CREATE TABLE "job_lease" (
	"name" text PRIMARY KEY NOT NULL,
	"holder" text NOT NULL,
	"locked_until" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_run" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"ok" boolean,
	"summary" text
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "connection" ADD COLUMN "last_sync_error" text;--> statement-breakpoint
ALTER TABLE "connection" ADD COLUMN "last_sync_error_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "job_run_name_started_idx" ON "job_run" USING btree ("name","started_at");