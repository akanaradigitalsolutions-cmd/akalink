CREATE TYPE "public"."consumer_gender" AS ENUM('pria', 'wanita');--> statement-breakpoint
CREATE TABLE "consumers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"hp" text,
	"gender" "consumer_gender",
	"instansi" text,
	"email" text,
	"tanggal_lahir" date,
	"agama" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consumers" ADD CONSTRAINT "consumers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consumers_tenant_id_idx" ON "consumers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "consumers_hp_idx" ON "consumers" USING btree ("hp");