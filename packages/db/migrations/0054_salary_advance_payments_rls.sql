-- ============================================================================
--  AkaLink — RLS untuk salary_advance_payments (riwayat cicilan/pelunasan kasbon)
-- ============================================================================
ALTER TABLE "salary_advance_payments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "salary_advance_payments_isolasi" ON "salary_advance_payments"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
