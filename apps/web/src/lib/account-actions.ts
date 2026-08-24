"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, employees } from "@akalink/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";

export type AccountResult = { ok: true } | { ok: false; error: string };

/** Ubah nama profil pengguna yang sedang login. */
export async function updateProfil(input: {
  nama: string;
}): Promise<AccountResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId)
    return { ok: false, error: "Sesi tidak valid. Silakan masuk lagi." };
  const nama = String(input.nama ?? "").trim();
  if (nama.length < 2) return { ok: false, error: "Nama minimal 2 karakter." };

  const db = getDb();
  await db
    .update(employees)
    .set({ nama, updatedAt: new Date() })
    .where(
      and(eq(employees.authUserId, user.id), eq(employees.tenantId, tenantId)),
    );
  revalidatePath("/akun");
  revalidatePath("/", "layout"); // perbarui nama di header
  return { ok: true };
}

export async function changePassword(input: {
  current: string;
  next: string;
}): Promise<AccountResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email)
    return { ok: false, error: "Sesi tidak valid. Silakan masuk lagi." };

  const current = String(input.current ?? "");
  const next = String(input.next ?? "");
  if (next.length < 8)
    return { ok: false, error: "Password baru minimal 8 karakter." };
  if (next === current)
    return { ok: false, error: "Password baru harus berbeda dari yang lama." };

  // Verifikasi password lama dulu (re-autentikasi).
  const { error: signErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (signErr) return { ok: false, error: "Password lama salah." };

  const { error: updErr } = await supabase.auth.updateUser({ password: next });
  if (updErr)
    return { ok: false, error: "Gagal memperbarui password. Coba lagi." };

  return { ok: true };
}
