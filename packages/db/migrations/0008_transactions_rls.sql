-- ============================================================================
--  AkaLink — RLS untuk transactions & transaction_items (Phase 1.3)
-- ============================================================================
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transaction_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_isolasi" ON "transactions"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());

CREATE POLICY "transaction_items_isolasi" ON "transaction_items"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
