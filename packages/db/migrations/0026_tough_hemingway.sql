CREATE TYPE "public"."app_coin_tipe" AS ENUM('topup', 'pemakaian', 'bonus', 'penyesuaian');--> statement-breakpoint
CREATE TABLE "app_coin_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tipe" "app_coin_tipe" NOT NULL,
	"delta" integer NOT NULL,
	"saldo_sesudah" integer NOT NULL,
	"keterangan" text,
	"ref_type" text,
	"ref_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "fitur_bayar_digital" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "saldo_koin" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "biaya_per_nota" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "biaya_per_wa" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "app_coin_ledger" ADD CONSTRAINT "app_coin_ledger_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_coin_tenant_id_idx" ON "app_coin_ledger" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "app_coin_ref_idx" ON "app_coin_ledger" USING btree ("ref_type","ref_id");