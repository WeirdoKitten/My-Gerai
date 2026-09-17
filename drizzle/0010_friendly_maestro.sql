CREATE TABLE "service_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"center_latitude" double precision NOT NULL,
	"center_longitude" double precision NOT NULL,
	"radius_km" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
