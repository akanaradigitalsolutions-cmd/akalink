-- ============================================================================
--  AkaLink — RLS untuk machines & machine_sessions (Phase 7)
--  Isolasi per-tenant. Catatan: API perangkat memakai koneksi service
--  (bypass RLS) & mencocokkan mesin lewat device_token.
-- ============================================================================
ALTER TABLE "machines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "machines_isolasi" ON "machines"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());

ALTER TABLE "machine_sessions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "machine_sessions_isolasi" ON "machine_sessions"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
