import "server-only";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb, consumers } from "@akalink/db";

/** Cari konsumen berdasarkan nama atau nomor HP (maks 25 hasil). */
export async function searchConsumers(tenantId: string, q: string) {
  const db = getDb();
  const term = `%${q}%`;
  return db
    .select()
    .from(consumers)
    .where(
      and(
        eq(consumers.tenantId, tenantId),
        or(ilike(consumers.nama, term), ilike(consumers.hp, term)),
      ),
    )
    .orderBy(desc(consumers.createdAt))
    .limit(25);
}

/** Ambil konsumen terbaru (default ketika belum ada pencarian). */
export async function getRecentConsumers(tenantId: string, limit = 25) {
  const db = getDb();
  return db
    .select()
    .from(consumers)
    .where(eq(consumers.tenantId, tenantId))
    .orderBy(desc(consumers.createdAt))
    .limit(limit);
}

/** Hitung total konsumen milik tenant. */
export async function countConsumers(tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(consumers)
    .where(eq(consumers.tenantId, tenantId));
  return row?.n ?? 0;
}
