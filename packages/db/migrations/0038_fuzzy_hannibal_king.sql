CREATE TYPE "public"."invoice_status" AS ENUM('terbit', 'lunas', 'batal');--> statement-breakpoint
CREATE TABLE "b2b_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"perusahaan" text NOT NULL,
	"pic" text,
	"telepon" text,
	"email" text,
	"alamat" text,
	"npwp" text,
	"termin_hari" integer DEFAULT 30 NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"b2b_client_id" uuid NOT NULL,
	"nomor" text NOT NULL,
	"periode_awal" date,
	"periode_akhir" date,
	"tanggal_terbit" timestamp with time zone DEFAULT now() NOT NULL,
	"jatuh_tempo" date,
	"total" integer DEFAULT 0 NOT NULL,
	"status" "invoice_status" DEFAULT 'terbit' NOT NULL,
	"catatan" text,
	"created_by" uuid,
	"lunas_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_nomor_unique" UNIQUE("nomor")
);
--> statement-breakpoint
ALTER TABLE "consumers" ADD COLUMN "b2b_client_id" uuid;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "fitur_b2b" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "b2b_clients" ADD CONSTRAINT "b2b_clients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_b2b_client_id_b2b_clients_id_fk" FOREIGN KEY ("b2b_client_id") REFERENCES "public"."b2b_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "b2b_clients_tenant_id_idx" ON "b2b_clients" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "invoices_tenant_id_idx" ON "invoices" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "invoices_client_id_idx" ON "invoices" USING btree ("b2b_client_id");