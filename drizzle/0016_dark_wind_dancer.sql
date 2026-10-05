ALTER TABLE "orders" ADD COLUMN "scheduled_for" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "pre_order_min_days" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "pre_order_max_days" integer;