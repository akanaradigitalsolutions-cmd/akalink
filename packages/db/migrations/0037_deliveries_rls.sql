-- ============================================================================
--  AkaLink — RLS untuk deliveries (Phase 8)
--  Isolasi per-tenant untuk pesanan antar-jemput.
-- ============================================================================
ALTER TABLE "deliveries" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deliveries_isolasi" ON "deliveries"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
