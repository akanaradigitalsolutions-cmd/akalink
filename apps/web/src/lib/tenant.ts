import "server-only";

import { eq } from "drizzle-orm";
import { getDb, tenants, employees } from "@akalink/db";

/**
 * Ambil data employee (dari authUserId) dan tenant (dari tenantId) untuk
 * pengguna yang sedang login. Dipakai oleh dashboard.
 */
export async function getTenantContext(userId: string, tenantId?: string) {
  const db = getDb();

  const [me] = await db
    .select()
    .from(employees)
    .where(eq(employees.authUserId, userId))
    .limit(1);

  const tenant = tenantId
    ? (await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1))[0]
    : undefined;

  return { me, tenant };
}
