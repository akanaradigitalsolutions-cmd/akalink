import "server-only";

import { desc, eq } from "drizzle-orm";
import { getDb, services } from "@akalink/db";

/** Ambil semua layanan milik tenant, terbaru dulu. */
export async function getServices(tenantId: string) {
  const db = getDb();
  return db
    .select()
    .from(services)
    .where(eq(services.tenantId, tenantId))
    .orderBy(desc(services.createdAt));
}
