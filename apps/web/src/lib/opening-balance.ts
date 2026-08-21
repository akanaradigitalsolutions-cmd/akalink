import "server-only";

import { and, eq } from "drizzle-orm";
import {
  getDb,
  journalEntries,
  journalLines,
  chartOfAccounts,
} from "@akalink/db";

export const REF_SALDO_AWAL = "saldo_awal";

// Pemetaan akun saldo awal.
export const AKUN_KAS_PERUSAHAAN = "1.1.01"; // Kas Besar
export const AKUN_KAS_LAUNDRY = "1.1.02"; // Kas Outlet
export const AKUN_BANK = "1.1.04"; // Bank

export type OpeningBalance = {
  kasPerusahaan: number;
  kasLaundry: number;
  bank: number;
  tanggal: string | null; // YYYY-MM-DD
  sudahDiatur: boolean;
};

/** Baca saldo awal (dari entri jurnal saldo_awal, bila ada). */
export async function getOpeningBalance(
  tenantId: string,
): Promise<OpeningBalance> {
  const db = getDb();
  const [entry] = await db
    .select({ id: journalEntries.id, tanggal: journalEntries.tanggal })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.tenantId, tenantId),
        eq(journalEntries.refType, REF_SALDO_AWAL),
        eq(journalEntries.refId, tenantId),
      ),
    )
    .limit(1);

  if (!entry) {
    return {
      kasPerusahaan: 0,
      kasLaundry: 0,
      bank: 0,
      tanggal: null,
      sudahDiatur: false,
    };
  }

  const lines = await db
    .select({ kode: chartOfAccounts.kode, debit: journalLines.debit })
    .from(journalLines)
    .innerJoin(chartOfAccounts, eq(journalLines.accountId, chartOfAccounts.id))
    .where(eq(journalLines.entryId, entry.id));

  const get = (kode: string) =>
    Math.round(
      lines
        .filter((l) => l.kode === kode)
        .reduce((s, l) => s + Number(l.debit), 0),
    );

  return {
    kasPerusahaan: get(AKUN_KAS_PERUSAHAAN),
    kasLaundry: get(AKUN_KAS_LAUNDRY),
    bank: get(AKUN_BANK),
    tanggal: entry.tanggal.toISOString().slice(0, 10),
    sudahDiatur: true,
  };
}
