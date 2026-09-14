ALTER TYPE "public"."payment_provider" ADD VALUE 'midtrans';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "gross_amount" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "qr_string" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "expires_at" timestamp with time zone;