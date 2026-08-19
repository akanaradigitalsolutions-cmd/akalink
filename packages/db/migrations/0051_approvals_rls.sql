-- ============================================================================
--  AkaLink — RLS untuk approvals (persetujuan aksi staf → pemilik)
-- ============================================================================
ALTER TABLE "approvals" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvals_isolasi" ON "approvals"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
