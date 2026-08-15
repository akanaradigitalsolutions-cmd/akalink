-- ============================================================================
--  AkaLink — RLS untuk b2b_clients & invoices (Phase 9)
--  Isolasi per-tenant untuk klien korporat & tagihan bulanan.
-- ============================================================================
ALTER TABLE "b2b_clients" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "b2b_clients_isolasi" ON "b2b_clients"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());

ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_isolasi" ON "invoices"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
