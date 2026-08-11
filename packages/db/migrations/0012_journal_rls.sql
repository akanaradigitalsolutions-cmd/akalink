-- ============================================================================
--  AkaLink — RLS untuk journal_entries & journal_lines (Phase 2.2)
-- ============================================================================
ALTER TABLE "journal_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "journal_lines" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_entries_isolasi" ON "journal_entries"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());

CREATE POLICY "journal_lines_isolasi" ON "journal_lines"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
