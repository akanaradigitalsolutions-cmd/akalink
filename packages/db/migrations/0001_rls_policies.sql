-- ============================================================================
--  AkaLink — Row-Level Security (Phase 0.4)
-- ----------------------------------------------------------------------------
--  Tujuan: setiap tenant HANYA bisa mengakses barisnya sendiri, dipaksakan
--  di level database. Aturan membaca `tenant_id` dari klaim JWT pengguna.
--
--  Catatan: `service_role` (dipakai server platform-admin & saat registrasi)
--  otomatis melewati RLS di Supabase, jadi tidak butuh policy khusus.
-- ============================================================================

-- Fungsi bantu: ambil tenant_id dari token JWT pengguna saat ini.
-- tenant_id disimpan di `app_metadata` (di-set server-side pada Phase 0.5).
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    COALESCE(
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id',
      current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id'
    ),
    ''
  )::uuid;
$$;

-- Aktifkan RLS untuk semua tabel bisnis.
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outlets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "access_levels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;

-- tenants: pengguna hanya melihat/mengubah baris tenant miliknya sendiri.
CREATE POLICY "tenants_isolasi" ON "tenants"
  FOR ALL TO authenticated
  USING ("id" = public.current_tenant_id())
  WITH CHECK ("id" = public.current_tenant_id());

-- outlets: dibatasi berdasarkan tenant_id.
CREATE POLICY "outlets_isolasi" ON "outlets"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());

-- employees: dibatasi berdasarkan tenant_id.
CREATE POLICY "employees_isolasi" ON "employees"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());

-- access_levels: dibatasi berdasarkan tenant_id.
CREATE POLICY "access_levels_isolasi" ON "access_levels"
  FOR ALL TO authenticated
  USING ("tenant_id" = public.current_tenant_id())
  WITH CHECK ("tenant_id" = public.current_tenant_id());

-- permissions: tidak punya tenant_id langsung, jadi diperiksa lewat access_levels.
CREATE POLICY "permissions_isolasi" ON "permissions"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "access_levels" al
      WHERE al."id" = "permissions"."access_level_id"
        AND al."tenant_id" = public.current_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "access_levels" al
      WHERE al."id" = "permissions"."access_level_id"
        AND al."tenant_id" = public.current_tenant_id()
    )
  );
