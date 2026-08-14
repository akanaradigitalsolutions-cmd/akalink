-- ============================================================================
--  AkaLink — RLS untuk app_coin_ledger (Phase 6)
--  Isolasi per-tenant untuk mutasi Saldo Koin AkaLink.
-- ============================================================================
ALTER TABLE "app_coin_ledger" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_coin_isolasi" ON "app_coin_ledger"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());

-- Idempotensi: satu potongan per sumber (mis. 1 nota = 1 potongan).
-- Top-up manual/DOKU boleh punya ref_id NULL (tidak kena unik ini).
CREATE UNIQUE INDEX "app_coin_ref_unik"
  ON "app_coin_ledger" ("tenant_id", "ref_type", "ref_id")
  WHERE "ref_id" IS NOT NULL;
