-- ============================================================================
--  AkaLink — RLS untuk cash_movements (Kas & Setoran)
-- ============================================================================
ALTER TABLE "cash_movements" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_movements_isolasi" ON "cash_movements"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
