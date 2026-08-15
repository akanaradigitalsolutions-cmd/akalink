CREATE TYPE "public"."delivery_status" AS ENUM('menunggu', 'dijadwalkan', 'dalam_perjalanan', 'selesai', 'batal');--> statement-breakpoint
CREATE TYPE "public"."delivery_type" AS ENUM('jemput', 'antar');--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid,
	"consumer_id" uuid,
	"transaction_id" uuid,
	"tipe" "delivery_type" NOT NULL,
	"kontak_nama" text,
	"kontak_hp" text,
	"alamat" text NOT NULL,
	"jadwal" timestamp with time zone,
	"kurir_id" uuid,
	"biaya_antar" integer DEFAULT 0 NOT NULL,
	"status" "delivery_status" DEFAULT 'menunggu' NOT NULL,
	"catatan" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "fitur_antar_jemput" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_consumer_id_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."consumers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deliveries_tenant_id_idx" ON "deliveries" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "deliveries_status_idx" ON "deliveries" USING btree ("status");