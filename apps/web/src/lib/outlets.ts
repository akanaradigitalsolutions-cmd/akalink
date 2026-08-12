import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { and, asc, eq } from "drizzle-orm";
import { getDb, outlets, tenants } from "@akalink/db";

export const OUTLET_COOKIE = "akalink_outlet";

export type OutletRow = {
  id: string;
  nama: string;
  telepon: string | null;
  kota: string | null;
  alamat: string | null;
};

/** Daftar outlet milik tenant (urut tertua dulu). */
export const getOutlets = cache(
  async (tenantId: string): Promise<OutletRow[]> => {
    const db = getDb();
    return db
      .select({
        id: outlets.id,
        nama: outlets.nama,
        telepon: outlets.telepon,
        kota: outlets.kota,
        alamat: outlets.alamat,
      })
      .from(outlets)
      .where(eq(outlets.tenantId, tenantId))
      .orderBy(asc(outlets.createdAt));
  },
);

/** Buat "Outlet Utama" dari data tenant bila belum ada outlet sama sekali. */
export async function seedDefaultOutletIfEmpty(tenantId: string) {
  const db = getDb();
  const existing = await db
    .select({ id: outlets.id })
    .from(outlets)
    .where(eq(outlets.tenantId, tenantId))
    .limit(1);
  if (existing.length > 0) return;

  const [t] = await db
    .select({
      nama: tenants.nama,
      kota: tenants.kota,
      alamat: tenants.alamat,
      telepon: tenants.telepon,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  await db.insert(outlets).values({
    tenantId,
    nama: t?.nama ? `${t.nama} — Outlet Utama` : "Outlet Utama",
    kota: t?.kota ?? null,
    alamat: t?.alamat ?? null,
    telepon: t?.telepon ?? null,
  });
}

/**
 * Outlet aktif (dari cookie); jika tidak valid/kosong, jatuh ke outlet
 * pertama. Mengembalikan null hanya bila tenant benar-benar tak punya outlet.
 */
export const getActiveOutlet = cache(
  async (tenantId: string): Promise<OutletRow | null> => {
    const list = await getOutlets(tenantId);
    if (list.length === 0) return null;

    const jar = await cookies();
    const picked = jar.get(OUTLET_COOKIE)?.value;
    const found = picked ? list.find((o) => o.id === picked) : undefined;
    return found ?? list[0];
  },
);

/** Validasi bahwa sebuah outletId milik tenant (untuk server action). */
export async function outletBelongsToTenant(
  tenantId: string,
  outletId: string,
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: outlets.id })
    .from(outlets)
    .where(and(eq(outlets.id, outletId), eq(outlets.tenantId, tenantId)))
    .limit(1);
  return !!row;
}
