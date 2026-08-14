CREATE TYPE "public"."coin_topup_status" AS ENUM('pending', 'success', 'failed', 'expired');--> statement-breakpoint
CREATE TABLE "coin_topup_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"amount" integer NOT NULL,
	"status" "coin_topup_status" DEFAULT 'pending' NOT NULL,
	"channel" text,
	"doku_token_id" text,
	"payment_url" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "coin_topup_orders_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
ALTER TABLE "coin_topup_orders" ADD CONSTRAINT "coin_topup_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coin_topup_tenant_id_idx" ON "coin_topup_orders" USING btree ("tenant_id");