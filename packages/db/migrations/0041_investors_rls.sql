-- ============================================================================
--  AkaLink — RLS untuk investors, investments, investor_payouts (Phase 9)
-- ============================================================================
ALTER TABLE "investors" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "investors_isolasi" ON "investors"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());

ALTER TABLE "investments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "investments_isolasi" ON "investments"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());

ALTER TABLE "investor_payouts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "investor_payouts_isolasi" ON "investor_payouts"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
