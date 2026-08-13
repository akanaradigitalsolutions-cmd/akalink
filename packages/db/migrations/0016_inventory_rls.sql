-- ============================================================================
--  AkaLink — RLS untuk inventory_items & inventory_movements (Phase 5)
-- ============================================================================
ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_movements" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_items_isolasi" ON "inventory_items"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());

CREATE POLICY "inventory_movements_isolasi" ON "inventory_movements"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
