-- ============================================================================
--  AkaLink — RLS untuk coin_topup_orders (Phase 6)
--  Isolasi per-tenant untuk pesanan isi ulang Saldo Koin via DOKU.
--  Catatan: webhook DOKU memakai koneksi service (bypass RLS) & mencocokkan
--  pesanan lewat invoice_number.
-- ============================================================================
ALTER TABLE "coin_topup_orders" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coin_topup_isolasi" ON "coin_topup_orders"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
