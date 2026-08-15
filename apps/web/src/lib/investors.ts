import "server-only";

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  getDb,
  investors,
  investments,
  investorPayouts,
  journalLines,
  journalEntries,
  chartOfAccounts,
} from "@akalink/db";

export type InvestorRow = {
  id: string;
  nama: string;
  telepon: string | null;
  aktif: boolean;
  totalModal: number;
  persenAktif: number;
  totalDibayar: number;
};

export async function getInvestors(tenantId: string): Promise<InvestorRow[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(investors)
    .where(eq(investors.tenantId, tenantId))
    .orderBy(investors.nama);
  if (rows.length === 0) return [];

  const inv = await db
    .select({
      investorId: investments.investorId,
      modal: investments.modal,
      persen: investments.persenBagiHasil,
      aktif: investments.aktif,
    })
    .from(investments)
    .where(eq(investments.tenantId, tenantId));

  const payouts = await db
    .select({ investorId: investorPayouts.investorId, jumlah: investorPayouts.jumlah })
    .from(investorPayouts)
    .where(eq(investorPayouts.tenantId, tenantId));

  return rows.map((r) => {
    const myInv = inv.filter((i) => i.investorId === r.id);
    return {
      id: r.id,
      nama: r.nama,
      telepon: r.telepon,
      aktif: r.aktif,
      totalModal: myInv.reduce((s, i) => s + i.modal, 0),
      persenAktif: myInv
        .filter((i) => i.aktif)
        .reduce((s, i) => s + Number(i.persen), 0),
      totalDibayar: payouts
        .filter((p) => p.investorId === r.id)
        .reduce((s, p) => s + p.jumlah, 0),
    };
  });
}

export async function getInvestorDetail(tenantId: string, id: string) {
  const db = getDb();
  const [investor] = await db
    .select()
    .from(investors)
    .where(and(eq(investors.id, id), eq(investors.tenantId, tenantId)))
    .limit(1);
  if (!investor) return null;

  const inv = await db
    .select()
    .from(investments)
    .where(and(eq(investments.tenantId, tenantId), eq(investments.investorId, id)))
    .orderBy(desc(investments.createdAt));

  const payouts = await db
    .select()
    .from(investorPayouts)
    .where(and(eq(investorPayouts.tenantId, tenantId), eq(investorPayouts.investorId, id)))
    .orderBy(desc(investorPayouts.createdAt));

  return { investor, investments: inv, payouts };
}

/** Laba bersih pada rentang tanggal (pendapatan − beban) dari jurnal. */
export async function getLabaPeriode(
  tenantId: string,
  awal?: string,
  akhir?: string,
): Promise<{ pendapatan: number; beban: number; laba: number }> {
  const db = getDb();
  const conds = [eq(journalLines.tenantId, tenantId)];
  if (awal) conds.push(gte(journalEntries.tanggal, new Date(awal)));
  if (akhir) conds.push(lte(journalEntries.tanggal, new Date(akhir + "T23:59:59")));

  const rows = await db
    .select({
      tipe: chartOfAccounts.tipe,
      debit: sql<number>`coalesce(sum(${journalLines.debit}),0)::float8`,
      kredit: sql<number>`coalesce(sum(${journalLines.kredit}),0)::float8`,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalLines.entryId, journalEntries.id))
    .innerJoin(chartOfAccounts, eq(journalLines.accountId, chartOfAccounts.id))
    .where(and(...conds))
    .groupBy(chartOfAccounts.tipe);

  let pendapatan = 0;
  let beban = 0;
  for (const r of rows) {
    if (r.tipe === "pendapatan") pendapatan += r.kredit - r.debit;
    else if (r.tipe === "beban") beban += r.debit - r.kredit;
  }
  const laba = Math.round(pendapatan - beban);
  return { pendapatan: Math.round(pendapatan), beban: Math.round(beban), laba };
}

export type ShareRow = {
  investorId: string;
  nama: string;
  persen: number;
  bagian: number;
};

/** Hitung bagian bagi hasil tiap investor aktif atas laba periode. */
export async function computeShares(
  tenantId: string,
  laba: number,
): Promise<ShareRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      investorId: investments.investorId,
      persen: investments.persenBagiHasil,
      nama: investors.nama,
    })
    .from(investments)
    .innerJoin(investors, eq(investments.investorId, investors.id))
    .where(
      and(
        eq(investments.tenantId, tenantId),
        eq(investments.aktif, true),
        eq(investors.aktif, true),
      ),
    );

  // Gabung per investor (jumlahkan persen bila punya beberapa investasi).
  const byInvestor = new Map<string, { nama: string; persen: number }>();
  for (const r of rows) {
    const cur = byInvestor.get(r.investorId) ?? { nama: r.nama, persen: 0 };
    cur.persen += Number(r.persen);
    byInvestor.set(r.investorId, cur);
  }

  return [...byInvestor.entries()].map(([investorId, v]) => ({
    investorId,
    nama: v.nama,
    persen: v.persen,
    bagian: Math.round((Math.max(0, laba) * v.persen) / 100),
  }));
}
