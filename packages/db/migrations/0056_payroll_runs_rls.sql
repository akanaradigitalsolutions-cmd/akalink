-- ============================================================================
--  AkaLink — RLS untuk payroll_runs (proses gaji / penggajian)
-- ============================================================================
ALTER TABLE "payroll_runs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payroll_runs_isolasi" ON "payroll_runs"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
