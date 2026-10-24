"use server";

import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { getDb, tenants, employees, accessLevels } from "@akalink/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPublicEnv } from "@/lib/env";

// ============================================================================
//  Reset total data laundry (DANGER). Hanya pemilik, wajib verifikasi kode OTP
//  ke email. Membuat tenant baru yang kosong lalu menghapus tenant lama —
//  karena semua tabel ber-FK tenant_id ON DELETE CASCADE, seluruh data lama
//  (outlet, layanan, transaksi, jurnal, dll.) ikut terhapus.
// ============================================================================

export type ResetState = { ok: boolean; error?: string };

async function currentOwner() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return null;
  const meta = user.app_metadata as
    | { role?: string; tenant_id?: string }
    | undefined;
  if (meta?.role !== "owner" || !meta.tenant_id) return null;
  return { id: user.id, email: user.email, tenantId: meta.tenant_id };
}

/** Langkah 1 — kirim kode 6 digit ke email pemilik. */
export async function kirimKodeReset(): Promise<ResetState> {
  const owner = await currentOwner();
  if (!owner)
    return {
      ok: false,
      error: "Hanya pemilik yang dapat mereset. Silakan masuk ulang.",
    };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: owner.email,
    options: { shouldCreateUser: false },
  });
  if (error) {
    console.error("[reset] kirim OTP:", error.message);
    return { ok: false, error: `Gagal kirim kode: ${error.message}` };
  }
  return { ok: true };
}

/** Langkah 2 — verifikasi kode lalu reset total. */
export async function konfirmasiReset(kode: string): Promise<ResetState> {
  const owner = await currentOwner();
  if (!owner) return { ok: false, error: "Sesi tidak valid. Masuk ulang." };

  const code = String(kode ?? "").trim();
  if (!/^\d{6,10}$/.test(code))
    return { ok: false, error: "Kode tidak valid (6–10 digit angka)." };

  // Verifikasi OTP lewat klien anon terpisah (tidak mengubah sesi cookie).
  const { url, anonKey } = getPublicEnv();
  const verifier = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: verif, error: vErr } = await verifier.auth.verifyOtp({
    email: owner.email,
    token: code,
    type: "email",
  });
  if (vErr || verif?.user?.id !== owner.id) {
    return {
      ok: false,
      error: "Kode salah atau sudah kedaluwarsa. Minta kode baru.",
    };
  }

  const db = getDb();

  // Ambil nama usaha & nama pemilik lama untuk tenant baru.
  const [oldTenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, owner.tenantId))
    .limit(1);
  const [oldOwner] = await db
    .select()
    .from(employees)
    .where(eq(employees.authUserId, owner.id))
    .limit(1);
  const namaLaundry = oldTenant?.nama ?? "Laundry Saya";
  const kota = oldTenant?.kota ?? null;
  const namaOwner = oldOwner?.nama ?? "Pemilik";

  // 1) Buat tenant baru + level akses + pemilik (atomik).
  let newTenantId: string;
  try {
    newTenantId = await db.transaction(async (tx) => {
      const [t] = await tx
        .insert(tenants)
        .values({ nama: namaLaundry, kota, tier: "basic", status: "trial" })
        .returning();
      await tx.insert(accessLevels).values({
        tenantId: t.id,
        nama: "Owner",
        deskripsi: "Akses penuh pemilik bisnis",
      });
      await tx.insert(employees).values({
        tenantId: t.id,
        authUserId: owner.id,
        nama: namaOwner,
        role: "owner",
        status: "active",
      });
      return t.id;
    });
  } catch (e) {
    console.error("[reset] buat tenant baru:", e);
    return { ok: false, error: "Gagal menyiapkan data baru. Coba lagi." };
  }

  // 2) Pindahkan pemilik ke tenant baru di JWT (app_metadata).
  const admin = createSupabaseAdminClient();
  const { error: metaErr } = await admin.auth.admin.updateUserById(owner.id, {
    app_metadata: { tenant_id: newTenantId, role: "owner" },
  });
  if (metaErr) {
    // Rollback tenant baru agar tidak ada tenant yatim.
    try {
      await db.delete(tenants).where(eq(tenants.id, newTenantId));
    } catch {
      /* abaikan */
    }
    console.error("[reset] update metadata:", metaErr.message);
    return { ok: false, error: "Gagal memindahkan akun. Coba lagi." };
  }

  // 3) Hapus tenant lama → cascade menghapus seluruh data lama.
  try {
    await db.delete(tenants).where(eq(tenants.id, owner.tenantId));
  } catch (e) {
    // Non-fatal: akun sudah pindah ke tenant baru; data lama cuma tersembunyi.
    console.error("[reset] hapus tenant lama (non-fatal):", e);
  }

  // 4) Keluarkan sesi lama (JWT masih menunjuk tenant lama) → wajib masuk ulang.
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  return { ok: true };
}
