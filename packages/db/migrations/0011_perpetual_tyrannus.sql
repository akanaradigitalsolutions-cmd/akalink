CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tanggal" timestamp with time zone DEFAULT now() NOT NULL,
	"keterangan" text NOT NULL,
	"ref_type" text,
	"ref_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"debit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"kredit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_entry_id_journal_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "je_tenant_id_idx" ON "journal_entries" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "je_ref_idx" ON "journal_entries" USING btree ("ref_type","ref_id");--> statement-breakpoint
CREATE INDEX "jl_entry_idx" ON "journal_lines" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "jl_account_idx" ON "journal_lines" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "jl_tenant_id_idx" ON "journal_lines" USING btree ("tenant_id");