CREATE TABLE "merchant_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_reviews_rating_range" CHECK ("merchant_reviews"."rating" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "merchant_reviews" ADD CONSTRAINT "merchant_reviews_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_reviews" ADD CONSTRAINT "merchant_reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_reviews_order_id_idx" ON "merchant_reviews" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "merchant_reviews_merchant_id_created_at_idx" ON "merchant_reviews" USING btree ("merchant_id","created_at");