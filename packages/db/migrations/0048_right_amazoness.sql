CREATE TYPE "public"."salary_advance_status" AS ENUM('belum_dipotong', 'dipotong');--> statement-breakpoint
CREATE TABLE "salary_advances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"jumlah" integer NOT NULL,
	"catatan" text,
	"status" "salary_advance_status" DEFAULT 'belum_dipotong' NOT NULL,
	"created_by" uuid,
	"created_by_nama" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "gaji" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "salary_advances_tenant_id_idx" ON "salary_advances" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "salary_advances_employee_id_idx" ON "salary_advances" USING btree ("employee_id");