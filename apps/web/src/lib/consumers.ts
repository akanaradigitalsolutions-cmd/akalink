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

/** Hitung total konsumen milik tenant. */
export async function countConsumers(tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(consumers)
    .where(eq(consumers.tenantId, tenantId));
  return row?.n ?? 0;
}
