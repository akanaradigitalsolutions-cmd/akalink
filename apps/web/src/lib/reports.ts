import "server-only";

import { and, eq, sql } from "drizzle-orm";
import {
  getDb,
  chartOfAccounts,
  journalLines,
  transactions,
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

/**
 * Pendapatan basis kas: hanya dari transaksi yang sudah LUNAS.
 * bruto = subtotal + biaya express; net = bruto − diskon (= Σ grandTotal).
 */
export async function getLunasRevenue(
  tenantId: string,
): Promise<{ bruto: number; diskon: number; net: number }> {
  const db = getDb();
  const [row] = await db
    .select({
      subtotal: sql<number>`coalesce(sum(${transactions.subtotal}),0)::float8`,
      express: sql<number>`coalesce(sum(${transactions.biayaExpress}),0)::float8`,
      diskon: sql<number>`coalesce(sum(${transactions.diskon}),0)::float8`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.tenantId, tenantId),
        eq(transactions.statusPembayaran, "lunas"),
      ),
    );
  const bruto = Math.round((row?.subtotal ?? 0) + (row?.express ?? 0));
  const diskon = Math.round(row?.diskon ?? 0);
  return { bruto, diskon, net: bruto - diskon };
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
