"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, suppliers } from "@akalink/db";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";

export type SupplierResult = { ok: true } | { ok: false; error: string };

async function ctx() {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId)
    return { ok: false as const, error: "Sesi tidak valid." };
  return { ok: true as const, tenantId };
}

const clean = (v?: string) => {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
};

export async function createSupplier(input: {
  nama: string;
  telepon?: string;
  alamat?: string;
}): Promise<SupplierResult> {
  const c = await ctx();
  if (!c.ok) return c;
  const nama = String(input.nama ?? "").trim();
  if (nama.length < 2) return { ok: false, error: "Nama supplier wajib diisi." };

  const db = getDb();
  await db.insert(suppliers).values({
    tenantId: c.tenantId,
    nama,
    telepon: clean(input.telepon),
    alamat: clean(input.alamat),
  });
  revalidatePath("/inventori");
  return { ok: true };
}

export async function updateSupplier(input: {
  id: string;
  nama: string;
  telepon?: string;
  alamat?: string;
  aktif?: boolean;
}): Promise<SupplierResult> {
  const c = await ctx();
  if (!c.ok) return c;
  const nama = String(input.nama ?? "").trim();
  if (nama.length < 2) return { ok: false, error: "Nama supplier wajib diisi." };

  const db = getDb();
  await db
    .update(suppliers)
    .set({
      nama,
      telepon: clean(input.telepon),
      alamat: clean(input.alamat),
      aktif: input.aktif ?? true,
    })
    .where(and(eq(suppliers.id, input.id), eq(suppliers.tenantId, c.tenantId)));
  revalidatePath("/inventori");
  return { ok: true };
}

export async function deleteSupplier(input: {
  id: string;
}): Promise<SupplierResult> {
  const c = await ctx();
  if (!c.ok) return c;
  const db = getDb();
  await db
    .delete(suppliers)
    .where(and(eq(suppliers.id, input.id), eq(suppliers.tenantId, c.tenantId)));
  revalidatePath("/inventori");
  return { ok: true };
}
