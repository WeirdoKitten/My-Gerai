CREATE INDEX "order_item_variant_selections_order_item_id_idx" ON "order_item_variant_selections" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_id_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_merchant_id_created_at_idx" ON "orders" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_merchant_id_status_idx" ON "orders" USING btree ("merchant_id","status");--> statement-breakpoint
CREATE INDEX "product_variant_groups_product_id_idx" ON "product_variant_groups" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_variant_options_group_id_idx" ON "product_variant_options" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "products_merchant_id_idx" ON "products" USING btree ("merchant_id");