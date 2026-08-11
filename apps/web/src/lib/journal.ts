import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import {
  getDb,
  chartOfAccounts,
  journalEntries,
  journalLines,
} from "@akalink/db";

type JLine = { kode: string; debit?: number; kredit?: number };

/**
 * Inti akuntansi: memposting satu entri jurnal berimbang (Σdebit = Σkredit).
 * `exec` bisa berupa db atau transaksi Drizzle (agar bisa atomik).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function postJournal(
  exec: any,
  tenantId: string,
  opts: {
    tanggal?: Date;
    keterangan: string;
    refType: string;
    refId?: string | null;
    lines: JLine[];
  },
): Promise<string> {
  const kodes = [...new Set(opts.lines.map((l) => l.kode))];
  const accs = await exec
    .select({ id: chartOfAccounts.id, kode: chartOfAccounts.kode })
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.tenantId, tenantId),
        inArray(chartOfAccounts.kode, kodes),
      ),
    );
  const map = new Map<string, string>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accs.map((a: any) => [a.kode as string, a.id as string]),
  );

  let totalD = 0;
  let totalK = 0;
  for (const l of opts.lines) {
    if (!map.has(l.kode)) throw new Error(`Akun ${l.kode} tidak ditemukan`);
    totalD += l.debit ?? 0;
    totalK += l.kredit ?? 0;
  }
  if (Math.round((totalD - totalK) * 100) !== 0) {
    throw new Error(`Jurnal tidak seimbang (D ${totalD} ≠ K ${totalK})`);
  }

  const [entry] = await exec
    .insert(journalEntries)
    .values({
      tenantId,
      tanggal: opts.tanggal ?? new Date(),
      keterangan: opts.keterangan,
      refType: opts.refType,
      refId: opts.refId ?? null,
    })
    .returning({ id: journalEntries.id });

  await exec.insert(journalLines).values(
    opts.lines.map((l) => ({
      tenantId,
      entryId: entry.id as string,
      accountId: map.get(l.kode)!,
      debit: String(l.debit ?? 0),
      kredit: String(l.kredit ?? 0),
    })),
  );

  return entry.id as string;
}

/** Cek apakah jurnal untuk sumber tertentu sudah ada (idempotensi). */
export async function hasJournal(
  tenantId: string,
  refType: string,
  refId: string,
): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: journalEntries.id })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.tenantId, tenantId),
        eq(journalEntries.refType, refType),
        eq(journalEntries.refId, refId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Ambil daftar jurnal terbaru beserta barisnya (untuk laporan Jurnal). */
export async function getJurnal(tenantId: string, limit = 100) {
  const db = getDb();
  const entries = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.tenantId, tenantId))
    .orderBy(desc(journalEntries.tanggal), desc(journalEntries.createdAt))
    .limit(limit);
  if (entries.length === 0) return [];

  const ids = entries.map((e) => e.id);
  const lines = await db
    .select({
      entryId: journalLines.entryId,
      debit: journalLines.debit,
      kredit: journalLines.kredit,
      kode: chartOfAccounts.kode,
      nama: chartOfAccounts.nama,
    })
    .from(journalLines)
    .leftJoin(chartOfAccounts, eq(journalLines.accountId, chartOfAccounts.id))
    .where(inArray(journalLines.entryId, ids));

  const byEntry = new Map<string, typeof lines>();
  for (const l of lines) {
    if (!byEntry.has(l.entryId)) byEntry.set(l.entryId, []);
    byEntry.get(l.entryId)!.push(l);
  }

  return entries.map((e) => ({ ...e, lines: byEntry.get(e.id) ?? [] }));
}
