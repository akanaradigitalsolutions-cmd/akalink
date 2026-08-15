-- ============================================================================
--  AkaLink — RLS untuk platform_admins (Phase 11)
--  Tabel lintas-tenant. RLS diaktifkan tanpa policy untuk role authenticated,
--  sehingga hanya dapat diakses lewat koneksi service (server) yang bypass RLS.
--  Klien Supabase (anon/authenticated) tidak bisa membaca tabel ini.
-- ============================================================================
ALTER TABLE "platform_admins" ENABLE ROW LEVEL SECURITY;

-- Seed admin platform awal (pemilik AkaLink). Ubah/hapus sesuai kebutuhan.
INSERT INTO "platform_admins" ("email", "nama")
VALUES ('akanaradigitalsolutions@gmail.com', 'Admin AkaLink')
ON CONFLICT ("email") DO NOTHING;
