CREATE TYPE "public"."session_client" AS ENUM('web', 'mobile');--> statement-breakpoint
CREATE TABLE "merchant_push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_push_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "client" "session_client" DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "merchant_push_tokens" ADD CONSTRAINT "merchant_push_tokens_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_push_tokens" ADD CONSTRAINT "merchant_push_tokens_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "merchant_push_tokens_merchant_id_index" ON "merchant_push_tokens" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "merchant_push_tokens_session_id_index" ON "merchant_push_tokens" USING btree ("session_id");