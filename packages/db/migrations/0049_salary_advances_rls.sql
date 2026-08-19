-- ============================================================================
--  AkaLink — RLS untuk salary_advances (kasbon / uang muka gaji)
-- ============================================================================
ALTER TABLE "salary_advances" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "salary_advances_isolasi" ON "salary_advances"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
