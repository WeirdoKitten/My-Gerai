CREATE TYPE "public"."order_item_substitution" AS ENUM('diganti', 'tidak_tersedia');--> statement-breakpoint
ALTER TABLE "merchants" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "managed_by_organizer_id" uuid;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "substitution" "order_item_substitution";--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "substitute_name" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "substituted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_managed_by_organizer_id_event_organizers_id_fk" FOREIGN KEY ("managed_by_organizer_id") REFERENCES "public"."event_organizers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "merchants_managed_by_organizer_id_idx" ON "merchants" USING btree ("managed_by_organizer_id");--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_login_or_proxy" CHECK (("merchants"."managed_by_organizer_id" is null) = ("merchants"."phone" is not null and "merchants"."password_hash" is not null));