-- ============================================================================
--  AkaLink — RLS untuk payment_orders (Phase 6)
--  Isolasi per-tenant untuk pembayaran nota konsumen via DOKU.
--  Catatan: webhook DOKU memakai koneksi service (bypass RLS) & mencocokkan
--  pesanan lewat invoice_number.
-- ============================================================================
ALTER TABLE "payment_orders" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_orders_isolasi" ON "payment_orders"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());
