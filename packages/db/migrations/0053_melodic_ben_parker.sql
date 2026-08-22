CREATE TABLE "salary_advance_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"advance_id" uuid NOT NULL,
	"employee_id" uuid,
	"jumlah" integer NOT NULL,
	"metode" text DEFAULT 'potong_gaji' NOT NULL,
	"tanggal" date,
	"catatan" text,
	"created_by_nama" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "salary_advances" ADD COLUMN "dibayar" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD COLUMN "tanggal" date;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD COLUMN "jatuh_tempo" date;--> statement-breakpoint
ALTER TABLE "salary_advance_payments" ADD CONSTRAINT "salary_advance_payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advance_payments" ADD CONSTRAINT "salary_advance_payments_advance_id_salary_advances_id_fk" FOREIGN KEY ("advance_id") REFERENCES "public"."salary_advances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "salary_adv_pay_tenant_id_idx" ON "salary_advance_payments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "salary_adv_pay_advance_id_idx" ON "salary_advance_payments" USING btree ("advance_id");