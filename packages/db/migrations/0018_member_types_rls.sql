-- ============================================================================
--  AkaLink — RLS untuk member_types (Phase 4)
-- ============================================================================
ALTER TABLE "member_types" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_types_isolasi" ON "member_types"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
