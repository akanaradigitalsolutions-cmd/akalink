CREATE TYPE "public"."delete_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "delete_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"transaction_id" uuid,
	"no_nota" text NOT NULL,
	"alasan" text NOT NULL,
	"status" "delete_request_status" DEFAULT 'pending' NOT NULL,
	"requested_by" uuid,
	"requested_by_nama" text,
	"decided_by" uuid,
	"decided_by_nama" text,
	"catatan_keputusan" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "delete_requests" ADD CONSTRAINT "delete_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delete_requests" ADD CONSTRAINT "delete_requests_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "delete_requests_tenant_id_idx" ON "delete_requests" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "delete_requests_status_idx" ON "delete_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "delete_requests_tx_idx" ON "delete_requests" USING btree ("transaction_id");