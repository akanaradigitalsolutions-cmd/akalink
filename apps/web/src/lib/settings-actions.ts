"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, tenants } from "@akalink/db";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";

export type SettingsResult = { ok: true } | { ok: false; error: string };

export type SettingsInput = {
  nama: string;
  kota?: string;
  telepon?: string;
  alamat?: string;
  syaratKetentuan?: string[];
};

export async function updateSettings(
  input: SettingsInput,
): Promise<SettingsResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId)
    return { ok: false, error: "Sesi tidak valid. Silakan masuk lagi." };

  const nama = String(input.nama ?? "").trim();
  if (nama.length < 2)
    return { ok: false, error: "Nama usaha wajib diisi (min. 2 huruf)." };

  const clean = (v?: string) => {
    const s = String(v ?? "").trim();
    return s.length ? s : null;
  };

  // Buang baris S&K yang kosong; simpan null bila tak ada satu pun.
  const sk = (input.syaratKetentuan ?? [])
    .map((s) => String(s ?? "").trim())
    .filter((s) => s.length > 0);

  try {
    const db = getDb();
    await db
      .update(tenants)
      .set({
        nama,
        kota: clean(input.kota),
        telepon: clean(input.telepon),
        alamat: clean(input.alamat),
        syaratKetentuan: sk.length ? sk : null,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal menyimpan.",
    };
  }

  revalidatePath("/pengaturan");
  revalidatePath("/dashboard");
  return { ok: true };
}
