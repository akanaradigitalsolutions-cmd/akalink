-- ============================================================================
--  AkaLink — RLS untuk chart_of_accounts (Phase 2.1)
-- ============================================================================
ALTER TABLE "chart_of_accounts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coa_isolasi" ON "chart_of_accounts"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
