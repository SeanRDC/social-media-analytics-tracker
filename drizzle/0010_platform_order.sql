CREATE TABLE "platform_order" (
	"user_id" text PRIMARY KEY NOT NULL,
	"platforms" text[] NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_order" ADD CONSTRAINT "platform_order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;