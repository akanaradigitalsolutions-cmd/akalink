import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb, memberTypes } from "@akalink/db";

export type MemberType = {
  id: string;
  nama: string;
  diskonPersen: string;
  aktif: boolean;
};

/** Semua jenis member milik tenant (terbaru dulu via nama). */
export async function getMemberTypes(
  tenantId: string,
  onlyActive = false,
): Promise<MemberType[]> {
  const db = getDb();
  const conds = [eq(memberTypes.tenantId, tenantId)];
  if (onlyActive) conds.push(eq(memberTypes.aktif, true));
  return db
    .select({
      id: memberTypes.id,
      nama: memberTypes.nama,
      diskonPersen: memberTypes.diskonPersen,
      aktif: memberTypes.aktif,
    })
    .from(memberTypes)
    .where(and(...conds))
    .orderBy(memberTypes.nama);
}
