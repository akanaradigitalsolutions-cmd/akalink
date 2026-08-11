"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AccountResult = { ok: true } | { ok: false; error: string };

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
