import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb, deleteRequests } from "@akalink/db";

export type DeleteRequestRow = {
  id: string;
  transactionId: string | null;
  noNota: string;
  alasan: string;
  requestedByNama: string | null;
  createdAt: string;
};

/** Daftar permintaan hapus yang masih menunggu keputusan pemilik. */
export async function getPendingDeleteRequests(
  tenantId: string,
  limit = 20,
): Promise<DeleteRequestRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: deleteRequests.id,
      transactionId: deleteRequests.transactionId,
      noNota: deleteRequests.noNota,
      alasan: deleteRequests.alasan,
      requestedByNama: deleteRequests.requestedByNama,
      createdAt: deleteRequests.createdAt,
    })
    .from(deleteRequests)
    .where(
      and(
        eq(deleteRequests.tenantId, tenantId),
        eq(deleteRequests.status, "pending"),
      ),
    )
    .orderBy(desc(deleteRequests.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

/** Permintaan hapus yang masih pending untuk sebuah nota (bila ada). */
export async function getPendingDeleteForTx(
  tenantId: string,
  transactionId: string,
): Promise<DeleteRequestRow | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: deleteRequests.id,
      transactionId: deleteRequests.transactionId,
      noNota: deleteRequests.noNota,
      alasan: deleteRequests.alasan,
      requestedByNama: deleteRequests.requestedByNama,
      createdAt: deleteRequests.createdAt,
    })
    .from(deleteRequests)
    .where(
      and(
        eq(deleteRequests.tenantId, tenantId),
        eq(deleteRequests.transactionId, transactionId),
        eq(deleteRequests.status, "pending"),
      ),
    )
    .limit(1);
  return row ? { ...row, createdAt: row.createdAt.toISOString() } : null;
}
