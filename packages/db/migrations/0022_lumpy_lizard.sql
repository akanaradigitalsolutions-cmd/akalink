CREATE TYPE "public"."promo_type" AS ENUM('persen', 'nominal');--> statement-breakpoint
CREATE TABLE "promos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kode" text NOT NULL,
	"nama" text NOT NULL,
	"tipe" "promo_type" DEFAULT 'persen' NOT NULL,
	"nilai" numeric(14, 2) DEFAULT '0' NOT NULL,
	"min_belanja" numeric(14, 2) DEFAULT '0' NOT NULL,
	"max_potongan" numeric(14, 2) DEFAULT '0' NOT NULL,
	"berlaku_sampai" date,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promos_tenant_kode_unique" UNIQUE("tenant_id","kode")
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "fitur_promo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "promos" ADD CONSTRAINT "promos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "promos_tenant_id_idx" ON "promos" USING btree ("tenant_id");