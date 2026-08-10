-- ============================================================================
--  AkaLink — RLS untuk tabel consumers (Phase 1.2)
-- ============================================================================
ALTER TABLE "consumers" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consumers_isolasi" ON "consumers"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
