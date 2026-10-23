ALTER TABLE "service_fee_invoices" ALTER COLUMN "merchant_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event_organizers" ADD COLUMN "qris_photo_url" text;--> statement-breakpoint
ALTER TABLE "service_fee_invoices" ADD COLUMN "organizer_id" uuid;--> statement-breakpoint
ALTER TABLE "service_fee_invoices" ADD CONSTRAINT "service_fee_invoices_organizer_id_event_organizers_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."event_organizers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "service_fee_invoices_organizer_period_idx" ON "service_fee_invoices" USING btree ("organizer_id","period_start");--> statement-breakpoint
-- Data lama: Gerai Titipan dipindah ke QRIS Pribadi; yang EO-nya belum punya QRIS dinonaktifkan sampai EO mengunggah QRIS.
UPDATE "merchants" SET "payment_mode" = 'qris_pribadi', "status" = CASE WHEN "qris_photo_url" IS NULL AND "status" = 'approved' THEN 'suspended'::"merchant_status" ELSE "status" END WHERE "managed_by_organizer_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_proxy_qris" CHECK ("merchants"."managed_by_organizer_id" is null or ("merchants"."payment_mode" = 'qris_pribadi' and ("merchants"."qris_photo_url" is not null or "merchants"."status" <> 'approved')));--> statement-breakpoint
ALTER TABLE "service_fee_invoices" ADD CONSTRAINT "service_fee_invoices_one_owner" CHECK (("service_fee_invoices"."merchant_id" is null) <> ("service_fee_invoices"."organizer_id" is null));