-- ============================================================================
--  AkaLink — RLS untuk promos (Phase 4 — promo/voucher)
-- ============================================================================
ALTER TABLE "promos" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promos_isolasi" ON "promos"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
