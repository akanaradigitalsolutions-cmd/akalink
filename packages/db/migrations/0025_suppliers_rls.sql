-- ============================================================================
--  AkaLink — RLS untuk suppliers (Phase 5)
-- ============================================================================
ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_isolasi" ON "suppliers"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
