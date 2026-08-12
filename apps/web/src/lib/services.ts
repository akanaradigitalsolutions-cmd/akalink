import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb, services } from "@akalink/db";

/** Ambil layanan milik tenant (opsional difilter per outlet), terbaru dulu. */
export async function getServices(tenantId: string, outletId?: string) {
  const db = getDb();
  const conds = [eq(services.tenantId, tenantId)];
  if (outletId) conds.push(eq(services.outletId, outletId));
  return db
    .select()
    .from(services)
    .where(and(...conds))
    .orderBy(desc(services.createdAt));
}

/**
 * Pindahkan layanan lama tanpa outlet (outlet_id NULL, dari era satu-outlet)
 * ke outlet default. Idempoten — hanya menyentuh baris yang masih NULL.
 */
export async function backfillOrphanServices(
  tenantId: string,
  outletId: string,
) {
  const db = getDb();
  await db
    .update(services)
    .set({ outletId })
    .where(and(eq(services.tenantId, tenantId), isNull(services.outletId)));
}
