-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"nir" text,
	"department" text,
	"municipality" text,
	"address_raw" text,
	"address_norm" text,
	"address_canonical" text,
	"address_struct" text,
	"via_code" text,
	"via_label" text,
	"primary_field" text,
	"secondary_field" text,
	"tertiary" text,
	"quadrant" text,
	"primary_number" double precision,
	"secondary_number" double precision,
	"tertiary_number" double precision,
	"units" text,
	"area_priv_m2" double precision,
	"area_const_m2" double precision,
	"transaction_value" double precision,
	"type_field" text,
	"linderos_json" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"neighborhood" text
);
--> statement-breakpoint
CREATE INDEX "idx_addresses_department" ON "addresses" USING btree ("department" text_ops);--> statement-breakpoint
CREATE INDEX "idx_addresses_municipality" ON "addresses" USING btree ("municipality" text_ops);--> statement-breakpoint
CREATE INDEX "idx_addresses_nir" ON "addresses" USING btree ("nir" text_ops);--> statement-breakpoint
CREATE INDEX "idx_addresses_quadrant" ON "addresses" USING btree ("quadrant" text_ops);--> statement-breakpoint
CREATE INDEX "idx_addresses_via_primary" ON "addresses" USING btree ("via_code" text_ops,"primary_number" text_ops);--> statement-breakpoint
CREATE INDEX "idx_addresses_via_secondary" ON "addresses" USING btree ("via_code" float8_ops,"secondary_number" float8_ops);
*/