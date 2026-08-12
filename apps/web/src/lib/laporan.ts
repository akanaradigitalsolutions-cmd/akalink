import "server-only";

import { and, desc, eq, gte, lt, lte, sql } from "drizzle-orm";
import {
  getDb,
  transactions,
  transactionItems,
  journalLines,
  journalEntries,
  chartOfAccounts,
} from "@akalink/db";

// Zona waktu aplikasi (WITA/Bali). Selaras dengan lib/dashboard.ts.
const APP_TZ = "Asia/Makassar";
const TZ_OFFSET = "+08:00";

/** YYYY-MM-DD sebuah instan menurut zona waktu aplikasi. */
export function ymdInTz(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function startInstant(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000${TZ_OFFSET}`);
}
function endInstant(ymd: string): Date {
  return new Date(`${ymd}T23:59:59.999${TZ_OFFSET}`);
}

/** Rentang preset relatif hari ini (dalam zona waktu aplikasi). */
export function presetRange(
  preset: string,
): { dari: string; sampai: string } {
  const today = ymdInTz(new Date());
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const d = Number(today.slice(8, 10));

  if (preset === "hari") return { dari: today, sampai: today };
  if (preset === "7hari") {
    const from = ymdInTz(new Date(Date.now() - 6 * 86_400_000));
    return { dari: from, sampai: today };
  }
  if (preset === "30hari") {
    const from = ymdInTz(new Date(Date.now() - 29 * 86_400_000));
    return { dari: from, sampai: today };
  }
  // default: bulan berjalan
  void y;
  void m;
  void d;
  const first = `${today.slice(0, 8)}01`;
  return { dari: first, sampai: today };
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
export function normalizeYmd(v: unknown, fallback: string): string {
  return typeof v === "string" && YMD_RE.test(v) ? v : fallback;
}

export type SalesReport = {
  dari: string;
  sampai: string;
  ringkasan: {
    jumlah: number;
    omzet: number;
    subtotal: number;
    diskon: number;
    express: number;
    rataRata: number;
  };
  statusBayar: { status: string; jumlah: number; total: number }[];
  perHari: { hari: string; omzet: number; jumlah: number }[];
  layanan: { nama: string; qty: number; omzet: number; jumlah: number }[];
};

/** Laporan penjualan untuk rentang tanggal [dari, sampai] (inklusif). */
export async function getSalesReport(
  tenantId: string,
  dari: string,
  sampai: string,
  outletId?: string,
): Promise<SalesReport> {
  const db = getDb();
  const start = startInstant(dari);
  const end = endInstant(sampai);
  const cond = and(
    eq(transactions.tenantId, tenantId),
    gte(transactions.createdAt, start),
    lte(transactions.createdAt, end),
    outletId ? eq(transactions.outletId, outletId) : undefined,
  );

  const [ringkasanRow] = await db
    .select({
      jumlah: sql<number>`count(*)::int`,
      omzet: sql<number>`coalesce(sum(${transactions.grandTotal}),0)::float8`,
      subtotal: sql<number>`coalesce(sum(${transactions.subtotal}),0)::float8`,
      diskon: sql<number>`coalesce(sum(${transactions.diskon}),0)::float8`,
      express: sql<number>`coalesce(sum(${transactions.biayaExpress}),0)::float8`,
    })
    .from(transactions)
    .where(cond);

  const statusRows = await db
    .select({
      status: transactions.statusPembayaran,
      jumlah: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${transactions.grandTotal}),0)::float8`,
    })
    .from(transactions)
    .where(cond)
    .groupBy(transactions.statusPembayaran);

  const hariExpr = sql<string>`to_char(${transactions.createdAt} at time zone ${sql.raw(
    `'${APP_TZ}'`,
  )}, 'YYYY-MM-DD')`;
  const perHariRows = await db
    .select({
      hari: hariExpr,
      omzet: sql<number>`coalesce(sum(${transactions.grandTotal}),0)::float8`,
      jumlah: sql<number>`count(*)::int`,
    })
    .from(transactions)
    .where(cond)
    .groupBy(hariExpr)
    .orderBy(hariExpr);

  const layananRows = await db
    .select({
      nama: transactionItems.namaLayanan,
      qty: sql<number>`coalesce(sum(${transactionItems.qty}),0)::float8`,
      omzet: sql<number>`coalesce(sum(${transactionItems.subtotal}),0)::float8`,
      jumlah: sql<number>`count(*)::int`,
    })
    .from(transactionItems)
    .innerJoin(
      transactions,
      eq(transactionItems.transactionId, transactions.id),
    )
    .where(cond)
    .groupBy(transactionItems.namaLayanan)
    .orderBy(desc(sql`coalesce(sum(${transactionItems.subtotal}),0)`));

  const jumlah = ringkasanRow?.jumlah ?? 0;
  const omzet = ringkasanRow?.omzet ?? 0;

  return {
    dari,
    sampai,
    ringkasan: {
      jumlah,
      omzet,
      subtotal: ringkasanRow?.subtotal ?? 0,
      diskon: ringkasanRow?.diskon ?? 0,
      express: ringkasanRow?.express ?? 0,
      rataRata: jumlah > 0 ? omzet / jumlah : 0,
    },
    statusBayar: statusRows,
    perHari: perHariRows,
    layanan: layananRows,
  };
}

export type CashFlow = {
  dari: string;
  sampai: string;
  saldoAwal: number;
  masuk: { kategori: string; nilai: number }[];
  keluar: { kategori: string; nilai: number }[];
  masukTotal: number;
  keluarTotal: number;
  net: number;
  saldoAkhir: number;
  perKas: {
    nama: string;
    saldoAwal: number;
    masuk: number;
    keluar: number;
    saldoAkhir: number;
  }[];
};

/** Laporan arus kas: kas masuk/keluar akun kas untuk rentang [dari, sampai]. */
export async function getCashFlow(
  tenantId: string,
  dari: string,
  sampai: string,
): Promise<CashFlow> {
  const db = getDb();
  const start = startInstant(dari);
  const end = endInstant(sampai);

  // Akun kas milik tenant.
  const kasRows = await db
    .select({ id: chartOfAccounts.id, nama: chartOfAccounts.nama })
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.tenantId, tenantId),
        eq(chartOfAccounts.isKas, true),
      ),
    );
  const kasIds = new Set(kasRows.map((r) => r.id));

  // Saldo awal per akun kas (semua mutasi sebelum tanggal mulai).
  const openRows = await db
    .select({
      accountId: journalLines.accountId,
      debit: sql<number>`coalesce(sum(${journalLines.debit}),0)::float8`,
      kredit: sql<number>`coalesce(sum(${journalLines.kredit}),0)::float8`,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalLines.entryId, journalEntries.id))
    .where(
      and(
        eq(journalLines.tenantId, tenantId),
        lt(journalEntries.tanggal, start),
      ),
    )
    .groupBy(journalLines.accountId);
  const openPer = new Map<string, number>();
  let saldoAwal = 0;
  for (const r of openRows) {
    if (!kasIds.has(r.accountId)) continue;
    const v = r.debit - r.kredit;
    openPer.set(r.accountId, v);
    saldoAwal += v;
  }

  // Semua baris jurnal dari entri dalam rentang (untuk cari lawan akun).
  const lines = await db
    .select({
      entryId: journalLines.entryId,
      accountId: journalLines.accountId,
      nama: chartOfAccounts.nama,
      debit: sql<number>`${journalLines.debit}::float8`,
      kredit: sql<number>`${journalLines.kredit}::float8`,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalLines.entryId, journalEntries.id))
    .innerJoin(
      chartOfAccounts,
      eq(journalLines.accountId, chartOfAccounts.id),
    )
    .where(
      and(
        eq(journalLines.tenantId, tenantId),
        gte(journalEntries.tanggal, start),
        lte(journalEntries.tanggal, end),
      ),
    );

  type Line = (typeof lines)[number];
  const byEntry = new Map<string, Line[]>();
  for (const l of lines) {
    const arr = byEntry.get(l.entryId);
    if (arr) arr.push(l);
    else byEntry.set(l.entryId, [l]);
  }

  const masukMap = new Map<string, number>();
  const keluarMap = new Map<string, number>();
  const perKasMov = new Map<string, { masuk: number; keluar: number }>();

  for (const ls of byEntry.values()) {
    for (const l of ls) {
      if (!kasIds.has(l.accountId)) continue;
      const lawan = ls.find((x) => x.accountId !== l.accountId);
      const label = lawan?.nama ?? "Lainnya";
      const mov = perKasMov.get(l.accountId) ?? { masuk: 0, keluar: 0 };
      if (l.debit > 0) {
        masukMap.set(label, (masukMap.get(label) ?? 0) + l.debit);
        mov.masuk += l.debit;
      }
      if (l.kredit > 0) {
        keluarMap.set(label, (keluarMap.get(label) ?? 0) + l.kredit);
        mov.keluar += l.kredit;
      }
      perKasMov.set(l.accountId, mov);
    }
  }

  const masuk = [...masukMap.entries()]
    .map(([kategori, nilai]) => ({ kategori, nilai }))
    .sort((a, b) => b.nilai - a.nilai);
  const keluar = [...keluarMap.entries()]
    .map(([kategori, nilai]) => ({ kategori, nilai }))
    .sort((a, b) => b.nilai - a.nilai);
  const masukTotal = masuk.reduce((s, x) => s + x.nilai, 0);
  const keluarTotal = keluar.reduce((s, x) => s + x.nilai, 0);
  const net = masukTotal - keluarTotal;

  const perKas = kasRows.map((k) => {
    const mov = perKasMov.get(k.id) ?? { masuk: 0, keluar: 0 };
    const awal = openPer.get(k.id) ?? 0;
    return {
      nama: k.nama,
      saldoAwal: awal,
      masuk: mov.masuk,
      keluar: mov.keluar,
      saldoAkhir: awal + mov.masuk - mov.keluar,
    };
  });

  return {
    dari,
    sampai,
    saldoAwal,
    masuk,
    keluar,
    masukTotal,
    keluarTotal,
    net,
    saldoAkhir: saldoAwal + net,
    perKas,
  };
}
