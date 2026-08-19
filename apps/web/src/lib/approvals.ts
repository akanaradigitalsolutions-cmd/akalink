import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb, approvals } from "@akalink/db";

export type ApprovalRow = {
  id: string;
  tipe: string;
  judul: string;
  nominal: number;
  requestedByNama: string | null;
  createdAt: string;
};

export async function getPendingApprovals(
  tenantId: string,
  limit = 20,
): Promise<ApprovalRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: approvals.id,
      tipe: approvals.tipe,
      judul: approvals.judul,
      nominal: approvals.nominal,
      requestedByNama: approvals.requestedByNama,
      createdAt: approvals.createdAt,
    })
    .from(approvals)
    .where(and(eq(approvals.tenantId, tenantId), eq(approvals.status, "pending")))
    .orderBy(desc(approvals.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}
