-- ============================================================================
--  AkaLink — RLS untuk delete_requests (persetujuan hapus nota)
-- ============================================================================
ALTER TABLE "delete_requests" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delete_requests_isolasi" ON "delete_requests"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
