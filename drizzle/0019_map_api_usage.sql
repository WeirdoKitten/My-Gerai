CREATE TABLE "map_api_usage" (
	"month" text NOT NULL,
	"sku" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "map_api_usage_month_sku_pk" PRIMARY KEY("month","sku")
);
