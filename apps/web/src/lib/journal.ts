import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  getDb,
  chartOfAccounts,
  journalEntries,
  journalLines,
} from "@akalink/db";
import { groupNamaByKode } from "@/lib/expense-taxonomy";

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

export type PengeluaranRow = {
  id: string;
  tanggal: Date;
  keterangan: string;
  jumlah: number;
  kategori: string;
  kas: string;
};

/**
 * Daftar pengeluaran (beban) terbaru. Dipakai pada halaman Pengeluaran kasir
 * agar entri yang baru dicatat langsung terlihat. Hanya entri refType
 * "pengeluaran": baris debit = akun beban, baris kredit = kas.
 */
export async function getPengeluaran(
  tenantId: string,
  limit = 30,
): Promise<PengeluaranRow[]> {
  const db = getDb();
  const entries = await db
    .select({
      id: journalEntries.id,
      tanggal: journalEntries.tanggal,
      keterangan: journalEntries.keterangan,
    })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.tenantId, tenantId),
        eq(journalEntries.refType, "pengeluaran"),
      ),
    )
    .orderBy(desc(journalEntries.tanggal), desc(journalEntries.createdAt))
    .limit(limit);
  if (entries.length === 0) return [];

  const ids = entries.map((e) => e.id);
  const lines = await db
    .select({
      entryId: journalLines.entryId,
      debit: journalLines.debit,
      kredit: journalLines.kredit,
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

  return entries.map((e) => {
    const ls = byEntry.get(e.id) ?? [];
    const beban = ls.find((l) => Number(l.debit) > 0);
    const kas = ls.find((l) => Number(l.kredit) > 0);
    return {
      id: e.id,
      tanggal: e.tanggal,
      keterangan: e.keterangan,
      jumlah: beban ? Number(beban.debit) : Number(kas?.kredit ?? 0),
      kategori: beban?.nama ?? "—",
      kas: kas?.nama ?? "—",
    };
  });
}

export type RincianProduk = { nama: string; total: number; count: number };
export type RincianKategori = {
  kode: string;
  nama: string;
  total: number;
  produk: RincianProduk[];
};
export type RincianGroup = {
  kode: string;
  nama: string;
  total: number;
  kategori: RincianKategori[];
};

/**
 * Rincian Pengeluaran berjenjang: Kelompok Akun → Kategori → Produk/Item,
 * dengan total per tingkat. Produk diambil dari keterangan jurnal (bagian
 * sebelum " — "). Dipakai pada laporan "Rincian Biaya".
 */
export async function getPengeluaranRincian(
  tenantId: string,
): Promise<RincianGroup[]> {
  const db = getDb();
  const rows = await db
    .select({
      keterangan: journalEntries.keterangan,
      kode: chartOfAccounts.kode,
      nama: chartOfAccounts.nama,
      debit: journalLines.debit,
    })
    .from(journalEntries)
    .innerJoin(journalLines, eq(journalLines.entryId, journalEntries.id))
    .innerJoin(
      chartOfAccounts,
      eq(chartOfAccounts.id, journalLines.accountId),
    )
    .where(
      and(
        eq(journalEntries.tenantId, tenantId),
        eq(journalEntries.refType, "pengeluaran"),
        sql`${journalLines.debit} > 0`,
      ),
    );

  const katMap = new Map<
    string,
    { nama: string; total: number; produk: Map<string, RincianProduk> }
  >();
  for (const r of rows) {
    const jumlah = Number(r.debit);
    if (!(jumlah > 0)) continue;
    let kat = katMap.get(r.kode);
    if (!kat) {
      kat = { nama: r.nama, total: 0, produk: new Map() };
      katMap.set(r.kode, kat);
    }
    kat.total += jumlah;
    const produkNama =
      String(r.keterangan ?? "").split(" — ")[0].trim() || "(Tanpa nama)";
    let p = kat.produk.get(produkNama);
    if (!p) {
      p = { nama: produkNama, total: 0, count: 0 };
      kat.produk.set(produkNama, p);
    }
    p.total += jumlah;
    p.count += 1;
  }

  const groupMap = new Map<string, RincianGroup>();
  for (const [katKode, kat] of katMap) {
    const groupKode = katKode.split(".").slice(0, -1).join(".");
    let g = groupMap.get(groupKode);
    if (!g) {
      g = {
        kode: groupKode,
        nama: groupNamaByKode(groupKode) ?? "Lainnya",
        total: 0,
        kategori: [],
      };
      groupMap.set(groupKode, g);
    }
    g.total += kat.total;
    g.kategori.push({
      kode: katKode,
      nama: kat.nama,
      total: kat.total,
      produk: [...kat.produk.values()].sort((a, b) => b.total - a.total),
    });
  }

  const groups = [...groupMap.values()].sort((a, b) => b.total - a.total);
  for (const g of groups) g.kategori.sort((a, b) => b.total - a.total);
  return groups;
}
