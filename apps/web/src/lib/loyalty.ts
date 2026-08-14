import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, pointTransactions, consumers } from "@akalink/db";

/**
 * Beri poin loyalitas saat transaksi lunas. Idempoten — tidak menambah dua
 * kali untuk transaksi yang sama. Poin = floor(grandTotal / poinRupiah).
 * `exec` boleh db utama atau transaksi (tx).
 */
export async function awardPointsOnPayment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exec: any,
  tenantId: string,
  consumerId: string | null,
  txId: string,
  grandTotal: number,
  poinRupiah: number,
): Promise<number> {
  if (!consumerId || poinRupiah <= 0) return 0;
  const poin = Math.floor(grandTotal / poinRupiah);
  if (poin <= 0) return 0;

  const existing = await exec
    .select({ id: pointTransactions.id })
    .from(pointTransactions)
    .where(
      and(
        eq(pointTransactions.tenantId, tenantId),
        eq(pointTransactions.refType, "transaksi"),
        eq(pointTransactions.refId, txId),
        eq(pointTransactions.tipe, "perolehan"),
      ),
    )
    .limit(1);
  if (existing.length > 0) return 0;

  await exec.insert(pointTransactions).values({
    tenantId,
    consumerId,
    tipe: "perolehan",
    delta: String(poin),
    keterangan: "Poin dari transaksi lunas",
    refType: "transaksi",
    refId: txId,
  });
  await exec
    .update(consumers)
    .set({ poin: sql`${consumers.poin} + ${poin}`, updatedAt: new Date() })
    .where(eq(consumers.id, consumerId));
  return poin;
}

export type PointRow = {
  id: string;
  tipe: string;
  delta: string;
  keterangan: string | null;
  createdAt: Date;
};

/** Riwayat poin seorang konsumen (terbaru dulu). */
export async function getPointHistory(
  tenantId: string,
  consumerId: string,
  limit = 20,
): Promise<PointRow[]> {
  const db = getDb();
  return db
    .select({
      id: pointTransactions.id,
      tipe: pointTransactions.tipe,
      delta: pointTransactions.delta,
      keterangan: pointTransactions.keterangan,
      createdAt: pointTransactions.createdAt,
    })
    .from(pointTransactions)
    .where(
      and(
        eq(pointTransactions.tenantId, tenantId),
        eq(pointTransactions.consumerId, consumerId),
      ),
    )
    .orderBy(desc(pointTransactions.createdAt))
    .limit(limit);
}
