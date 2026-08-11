import "server-only";

import { eq, sql } from "drizzle-orm";
import {
  getDb,
  chartOfAccounts,
  journalLines,
} from "@akalink/db";

export type LedgerRow = {
  kode: string;
  nama: string;
  tipe: "aset" | "kewajiban" | "modal" | "pendapatan" | "beban";
  saldoNormal: "debit" | "kredit";
  debit: number;
  kredit: number;
  saldo: number;
};

/** Ringkasan buku besar: total debit/kredit & saldo per akun (yang bergerak). */
export async function getLedger(tenantId: string): Promise<LedgerRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      kode: chartOfAccounts.kode,
      nama: chartOfAccounts.nama,
      tipe: chartOfAccounts.tipe,
      saldoNormal: chartOfAccounts.saldoNormal,
      debit: sql<number>`coalesce(sum(${journalLines.debit}),0)::float8`,
      kredit: sql<number>`coalesce(sum(${journalLines.kredit}),0)::float8`,
    })
    .from(journalLines)
    .innerJoin(
      chartOfAccounts,
      eq(journalLines.accountId, chartOfAccounts.id),
    )
    .where(eq(journalLines.tenantId, tenantId))
    .groupBy(
      chartOfAccounts.kode,
      chartOfAccounts.nama,
      chartOfAccounts.tipe,
      chartOfAccounts.saldoNormal,
    )
    .orderBy(chartOfAccounts.kode);

  return rows.map((r) => ({
    ...r,
    saldo:
      r.saldoNormal === "debit" ? r.debit - r.kredit : r.kredit - r.debit,
  }));
}

/** Net per tipe: pendapatan & modal/kewajiban pakai (kredit−debit); aset & beban pakai (debit−kredit). */
export function netByTipe(rows: LedgerRow[], tipe: LedgerRow["tipe"]) {
  const filtered = rows.filter((r) => r.tipe === tipe);
  const kreditNormal =
    tipe === "pendapatan" || tipe === "kewajiban" || tipe === "modal";
  const total = filtered.reduce(
    (s, r) => s + (kreditNormal ? r.kredit - r.debit : r.debit - r.kredit),
    0,
  );
  const items = filtered.map((r) => ({
    kode: r.kode,
    nama: r.nama,
    nilai: kreditNormal ? r.kredit - r.debit : r.debit - r.kredit,
  }));
  return { items, total };
}
