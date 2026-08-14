-- ============================================================================
--  AkaLink — RLS untuk point_transactions (Phase 4 — poin loyalitas)
-- ============================================================================
ALTER TABLE "point_transactions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "point_transactions_isolasi" ON "point_transactions"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
