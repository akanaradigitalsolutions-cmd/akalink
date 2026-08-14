CREATE TYPE "public"."point_tx_type" AS ENUM('perolehan', 'penukaran', 'penyesuaian');--> statement-breakpoint
CREATE TABLE "point_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"consumer_id" uuid NOT NULL,
	"tipe" "point_tx_type" NOT NULL,
	"delta" numeric(14, 2) NOT NULL,
	"keterangan" text,
	"ref_type" text,
	"ref_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "poin_rupiah" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_consumer_id_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "point_tx_tenant_id_idx" ON "point_transactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "point_tx_consumer_id_idx" ON "point_transactions" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "point_tx_ref_idx" ON "point_transactions" USING btree ("ref_type","ref_id");