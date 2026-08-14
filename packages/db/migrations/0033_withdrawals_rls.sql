-- ============================================================================
--  AkaLink — RLS untuk withdrawals (Phase 6)
--  Isolasi per-tenant untuk penarikan dana pembayaran digital.
-- ============================================================================
ALTER TABLE "withdrawals" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "withdrawals_isolasi" ON "withdrawals"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
