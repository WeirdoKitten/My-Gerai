CREATE TYPE "public"."merchant_payment_mode" AS ENUM('gateway', 'qris_pribadi');--> statement-breakpoint
CREATE TYPE "public"."service_fee_invoice_status" AS ENUM('belum_lunas', 'lunas', 'dibatalkan');--> statement-breakpoint
ALTER TYPE "public"."payment_provider" ADD VALUE 'qris_pribadi';--> statement-breakpoint
CREATE TABLE "service_fee_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"amount" integer NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"status" "service_fee_invoice_status" DEFAULT 'belum_lunas' NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"reference_id" text,
	"qr_string" text,
	"paid_at" timestamp with time zone,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "payment_mode" "merchant_payment_mode" DEFAULT 'gateway' NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "qris_photo_url" text;--> statement-breakpoint
ALTER TABLE "service_fee_invoices" ADD CONSTRAINT "service_fee_invoices_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "service_fee_invoices_merchant_period_idx" ON "service_fee_invoices" USING btree ("merchant_id","period_start");