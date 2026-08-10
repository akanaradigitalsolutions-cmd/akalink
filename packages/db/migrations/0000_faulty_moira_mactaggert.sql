CREATE TYPE "public"."employee_status" AS ENUM('invited', 'active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('trial', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."tenant_tier" AS ENUM('basic', 'premium', 'power');--> statement-breakpoint
CREATE TABLE "access_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"deskripsi" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"auth_user_id" uuid,
	"nama" text NOT NULL,
	"employee_code" text,
	"role" text DEFAULT 'kasir' NOT NULL,
	"outlet_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"status" "employee_status" DEFAULT 'invited' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_tenant_code_unique" UNIQUE("tenant_id","employee_code")
);
--> statement-breakpoint
CREATE TABLE "outlets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"telepon" text,
	"kota" text,
	"alamat" text,
	"logo_url" text,
	"jam_operasional" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"access_level_id" uuid NOT NULL,
	"key" text NOT NULL,
	CONSTRAINT "permissions_level_key_unique" UNIQUE("access_level_id","key")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"kota" text,
	"tier" "tenant_tier" DEFAULT 'basic' NOT NULL,
	"status" "tenant_status" DEFAULT 'trial' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_levels" ADD CONSTRAINT "access_levels_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_access_level_id_access_levels_id_fk" FOREIGN KEY ("access_level_id") REFERENCES "public"."access_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_levels_tenant_id_idx" ON "access_levels" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "employees_tenant_id_idx" ON "employees" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "employees_auth_user_id_idx" ON "employees" USING btree ("auth_user_id");--> statement-breakpoint
CREATE INDEX "outlets_tenant_id_idx" ON "outlets" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "permissions_access_level_id_idx" ON "permissions" USING btree ("access_level_id");