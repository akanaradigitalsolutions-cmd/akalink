import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb, promos } from "@akalink/db";

export type PromoRow = {
  id: string;
  kode: string;
  nama: string;
  tipe: string;
  nilai: string;
  minBelanja: string;
  maxPotongan: string;
  berlakuSampai: string | null;
  aktif: boolean;
};

export async function getPromos(tenantId: string): Promise<PromoRow[]> {
  const db = getDb();
  return db
    .select({
      id: promos.id,
      kode: promos.kode,
      nama: promos.nama,
      tipe: promos.tipe,
      nilai: promos.nilai,
      minBelanja: promos.minBelanja,
      maxPotongan: promos.maxPotongan,
      berlakuSampai: promos.berlakuSampai,
      aktif: promos.aktif,
    })
    .from(promos)
    .where(eq(promos.tenantId, tenantId))
    .orderBy(desc(promos.createdAt));
}

/** Hitung potongan dari sebuah promo untuk subtotal tertentu (server-side). */
export function hitungPotongan(
  promo: {
    tipe: string;
    nilai: string | number;
    maxPotongan: string | number;
  },
  subtotal: number,
): number {
  const nilai = Number(promo.nilai);
  const maxP = Number(promo.maxPotongan);
  let potongan =
    promo.tipe === "persen" ? Math.round((subtotal * nilai) / 100) : nilai;
  if (promo.tipe === "persen" && maxP > 0) potongan = Math.min(potongan, maxP);
  return Math.max(0, Math.min(potongan, subtotal));
}

/** Cari promo aktif berdasarkan kode (case-insensitive) milik tenant. */
export async function findPromoByKode(tenantId: string, kode: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(promos)
    .where(
      and(eq(promos.tenantId, tenantId), eq(promos.kode, kode.toUpperCase())),
    )
    .limit(1);
  return row ?? null;
}
