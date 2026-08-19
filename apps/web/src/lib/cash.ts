import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import {
  getDb,
  cashMovements,
  chartOfAccounts,
  journalLines,
} from "@akalink/db";

/** Saldo satu akun (debit−kredit untuk akun bersaldo normal debit). */
export async function getAccountBalance(
  tenantId: string,
  kode: string,
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({
      debit: sql<number>`coalesce(sum(${journalLines.debit}),0)::float8`,
      kredit: sql<number>`coalesce(sum(${journalLines.kredit}),0)::float8`,
    })
    .from(journalLines)
    .innerJoin(chartOfAccounts, eq(journalLines.accountId, chartOfAccounts.id))
    .where(and(eq(journalLines.tenantId, tenantId), eq(chartOfAccounts.kode, kode)));
  return Math.round((row?.debit ?? 0) - (row?.kredit ?? 0));
}

export type CashMovementRow = {
  id: string;
  tipe: "setor_bank" | "ambil_owner" | "kas_masuk";
  jumlah: number;
  tujuan: string | null;
  catatan: string | null;
  createdByNama: string | null;
  createdAt: string;
};

export async function getCashMovements(
  tenantId: string,
  limit = 40,
): Promise<CashMovementRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: cashMovements.id,
      tipe: cashMovements.tipe,
      jumlah: cashMovements.jumlah,
      tujuan: cashMovements.tujuan,
      catatan: cashMovements.catatan,
      createdByNama: cashMovements.createdByNama,
      createdAt: cashMovements.createdAt,
    })
    .from(cashMovements)
    .where(eq(cashMovements.tenantId, tenantId))
    .orderBy(desc(cashMovements.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}
