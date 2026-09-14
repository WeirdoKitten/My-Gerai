CREATE TYPE "public"."merchant_manual_override" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "merchant_operating_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"open_time" time NOT NULL,
	"close_time" time NOT NULL
);
--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "manual_override" "merchant_manual_override";--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "manual_override_set_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "merchant_operating_hours" ADD CONSTRAINT "merchant_operating_hours_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_operating_hours_merchant_day_idx" ON "merchant_operating_hours" USING btree ("merchant_id","day_of_week");