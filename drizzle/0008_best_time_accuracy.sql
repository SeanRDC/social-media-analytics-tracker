CREATE TABLE "online_followers" (
	"id" text PRIMARY KEY NOT NULL,
	"connection_id" text NOT NULL,
	"hour_start" timestamp with time zone NOT NULL,
	"followers" integer NOT NULL,
	CONSTRAINT "online_followers_connection_hour_uq" UNIQUE("connection_id","hour_start")
);
--> statement-breakpoint
ALTER TABLE "post_stat" ADD COLUMN "captured_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "online_followers" ADD CONSTRAINT "online_followers_connection_id_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connection"("id") ON DELETE cascade ON UPDATE no action;