CREATE TYPE "public"."item_status" AS ENUM('belum_dikerjakan', 'selesai');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('belum_dibayar', 'dp', 'lunas');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('reguler', 'self_service', 'dropoff', 'deposit');--> statement-breakpoint
CREATE TYPE "public"."work_status" AS ENUM('belum_dikerjakan', 'proses', 'selesai', 'diambil');--> statement-breakpoint
CREATE TABLE "transaction_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"service_id" uuid,
	"nama_layanan" text NOT NULL,
	"tipe_satuan" text NOT NULL,
	"qty" numeric(12, 2) DEFAULT '1' NOT NULL,
	"harga" numeric(12, 2) DEFAULT '0' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "item_status" DEFAULT 'belum_dikerjakan' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid,
	"no_nota" text NOT NULL,
	"tipe" "transaction_type" DEFAULT 'reguler' NOT NULL,
	"consumer_id" uuid,
	"kasir_id" uuid,
	"order_diterima" timestamp with time zone DEFAULT now() NOT NULL,
	"estimasi_selesai" timestamp with time zone,
	"status_pekerjaan" "work_status" DEFAULT 'belum_dikerjakan' NOT NULL,
	"status_pembayaran" "payment_status" DEFAULT 'belum_dibayar' NOT NULL,
	"is_express" boolean DEFAULT false NOT NULL,
	"catatan" text,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"diskon" numeric(12, 2) DEFAULT '0' NOT NULL,
	"biaya_express" numeric(12, 2) DEFAULT '0' NOT NULL,
	"grand_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_no_nota_unique" UNIQUE("no_nota")
);
--> statement-breakpoint
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_consumer_id_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."consumers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_kasir_id_employees_id_fk" FOREIGN KEY ("kasir_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transaction_items_tx_idx" ON "transaction_items" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "transaction_items_tenant_id_idx" ON "transaction_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "transactions_tenant_id_idx" ON "transactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "transactions_consumer_id_idx" ON "transactions" USING btree ("consumer_id");