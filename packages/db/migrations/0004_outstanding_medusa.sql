CREATE TYPE "public"."estimasi_unit" AS ENUM('jam', 'hari');--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "estimasi_satuan" "estimasi_unit" DEFAULT 'jam' NOT NULL;