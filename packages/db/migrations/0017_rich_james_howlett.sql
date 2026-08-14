CREATE TABLE "member_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"diskon_persen" numeric(5, 2) DEFAULT '0' NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consumers" ADD COLUMN "member_type_id" uuid;--> statement-breakpoint
ALTER TABLE "consumers" ADD COLUMN "poin" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "member_types" ADD CONSTRAINT "member_types_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_types_tenant_id_idx" ON "member_types" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "consumers" ADD CONSTRAINT "consumers_member_type_id_member_types_id_fk" FOREIGN KEY ("member_type_id") REFERENCES "public"."member_types"("id") ON DELETE set null ON UPDATE no action;