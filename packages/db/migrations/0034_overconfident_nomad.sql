CREATE TYPE "public"."machine_session_status" AS ENUM('running', 'selesai', 'batal');--> statement-breakpoint
CREATE TYPE "public"."machine_status" AS ENUM('idle', 'running', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."machine_type" AS ENUM('mesin_cuci', 'pengering');--> statement-breakpoint
CREATE TABLE "machine_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"machine_id" uuid NOT NULL,
	"outlet_id" uuid,
	"consumer_id" uuid,
	"kasir_id" uuid,
	"mulai" timestamp with time zone DEFAULT now() NOT NULL,
	"selesai_estimasi" timestamp with time zone NOT NULL,
	"selesai" timestamp with time zone,
	"durasi_menit" integer NOT NULL,
	"biaya" integer DEFAULT 0 NOT NULL,
	"metode_bayar" text DEFAULT 'tunai' NOT NULL,
	"status" "machine_session_status" DEFAULT 'running' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"outlet_id" uuid,
	"nama" text NOT NULL,
	"tipe" "machine_type" DEFAULT 'mesin_cuci' NOT NULL,
	"kapasitas_kg" numeric(6, 2),
	"harga_sesi" integer DEFAULT 0 NOT NULL,
	"durasi_menit" integer DEFAULT 40 NOT NULL,
	"status" "machine_status" DEFAULT 'idle' NOT NULL,
	"device_token" text NOT NULL,
	"last_seen_at" timestamp with time zone,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "machines_device_token_unique" UNIQUE("device_token")
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "fitur_self_service" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "machine_sessions" ADD CONSTRAINT "machine_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_sessions" ADD CONSTRAINT "machine_sessions_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_sessions" ADD CONSTRAINT "machine_sessions_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_sessions" ADD CONSTRAINT "machine_sessions_consumer_id_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."consumers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "machine_sessions_tenant_id_idx" ON "machine_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "machine_sessions_machine_id_idx" ON "machine_sessions" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "machines_tenant_id_idx" ON "machines" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "machines_outlet_id_idx" ON "machines" USING btree ("outlet_id");