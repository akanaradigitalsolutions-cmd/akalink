CREATE TABLE "payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"periode_mulai" date,
	"periode_akhir" date,
	"tanggal_bayar" date NOT NULL,
	"gaji_pokok" integer NOT NULL,
	"potongan_kasbon" integer DEFAULT 0 NOT NULL,
	"gaji_bersih" integer NOT NULL,
	"akun" text DEFAULT '1.1.02' NOT NULL,
	"catatan" text,
	"created_by_nama" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "tanggal_mulai" date;--> statement-breakpoint
ALTER TABLE "salary_advance_payments" ADD COLUMN "payroll_run_id" uuid;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payroll_runs_tenant_id_idx" ON "payroll_runs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payroll_runs_employee_id_idx" ON "payroll_runs" USING btree ("employee_id");