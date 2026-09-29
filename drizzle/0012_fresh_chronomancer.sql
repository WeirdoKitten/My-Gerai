CREATE TYPE "public"."delivery_failure_reason" AS ENUM('tidak_bisa_dihubungi', 'alamat_tidak_ditemukan', 'lainnya');--> statement-breakpoint
CREATE TYPE "public"."order_fulfillment_method" AS ENUM('ambil_sendiri', 'antar');--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'sedang_diantar';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'gagal_diantar';--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "delivery_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "delivery_fee" integer;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "delivery_radius_km" double precision DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "delivery_estimate" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfillment_method" "order_fulfillment_method" DEFAULT 'ambil_sendiri' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "buyer_phone" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_address" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_landmark" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_latitude" double precision;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_longitude" double precision;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_fee_snapshot" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_distance_km" double precision;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_failure_reason" "delivery_failure_reason";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_failure_note" text;