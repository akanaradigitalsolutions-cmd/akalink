CREATE TABLE "investments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"investor_id" uuid NOT NULL,
	"outlet_id" uuid,
	"modal" integer DEFAULT 0 NOT NULL,
	"persen_bagi_hasil" numeric(5, 2) DEFAULT '0' NOT NULL,
	"tanggal_mulai" date,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investor_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"investor_id" uuid NOT NULL,
	"periode_awal" date,
	"periode_akhir" date,
	"laba_periode" integer DEFAULT 0 NOT NULL,
	"persen" numeric(5, 2) DEFAULT '0' NOT NULL,
	"jumlah" integer NOT NULL,
	"catatan" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"telepon" text,
	"email" text,
	"catatan" text,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "fitur_investor" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_investor_id_investors_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investor_payouts" ADD CONSTRAINT "investor_payouts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investor_payouts" ADD CONSTRAINT "investor_payouts_investor_id_investors_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investors" ADD CONSTRAINT "investors_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "investments_tenant_id_idx" ON "investments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "investments_investor_id_idx" ON "investments" USING btree ("investor_id");--> statement-breakpoint
CREATE INDEX "investor_payouts_tenant_id_idx" ON "investor_payouts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "investors_tenant_id_idx" ON "investors" USING btree ("tenant_id");