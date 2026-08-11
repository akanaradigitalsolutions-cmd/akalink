CREATE TYPE "public"."account_type" AS ENUM('aset', 'kewajiban', 'modal', 'pendapatan', 'beban');--> statement-breakpoint
CREATE TYPE "public"."normal_balance" AS ENUM('debit', 'kredit');--> statement-breakpoint
CREATE TABLE "chart_of_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kode" text NOT NULL,
	"nama" text NOT NULL,
	"tipe" "account_type" NOT NULL,
	"saldo_normal" "normal_balance" NOT NULL,
	"parent_id" uuid,
	"is_kas" boolean DEFAULT false NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coa_tenant_kode_unique" UNIQUE("tenant_id","kode")
);
--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coa_tenant_id_idx" ON "chart_of_accounts" USING btree ("tenant_id");