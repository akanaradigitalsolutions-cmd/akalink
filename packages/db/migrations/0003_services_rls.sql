-- ============================================================================
--  AkaLink — RLS untuk tabel services (Phase 1.1)
-- ============================================================================
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_isolasi" ON "services"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
