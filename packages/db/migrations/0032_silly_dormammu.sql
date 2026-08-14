CREATE TABLE "withdrawals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"fee" integer DEFAULT 0 NOT NULL,
	"net_amount" integer NOT NULL,
	"bank_nama" text NOT NULL,
	"bank_rekening" text NOT NULL,
	"bank_atas_nama" text NOT NULL,
	"status" "coin_topup_status" DEFAULT 'pending' NOT NULL,
	"catatan" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "bayar_digital_setuju_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "saldo_pembayaran" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "withdrawals_tenant_id_idx" ON "withdrawals" USING btree ("tenant_id");