CREATE TABLE "payment_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"outlet_id" uuid,
	"invoice_number" text NOT NULL,
	"amount" integer NOT NULL,
	"fee_admin" integer DEFAULT 0 NOT NULL,
	"fee_transfer" integer DEFAULT 0 NOT NULL,
	"net_amount" integer DEFAULT 0 NOT NULL,
	"status" "coin_topup_status" DEFAULT 'pending' NOT NULL,
	"channel" text,
	"doku_token_id" text,
	"payment_url" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "payment_orders_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "biaya_admin_persen" numeric(5, 2) DEFAULT '3.5' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "biaya_transfer" integer DEFAULT 2500 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_orders_tenant_id_idx" ON "payment_orders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payment_orders_transaction_id_idx" ON "payment_orders" USING btree ("transaction_id");