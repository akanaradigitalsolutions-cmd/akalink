import "server-only";

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb, transactions, transactionItems } from "@akalink/db";

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
): Promise<SalesReport> {
  const db = getDb();
  const start = startInstant(dari);
  const end = endInstant(sampai);
  const cond = and(
    eq(transactions.tenantId, tenantId),
    gte(transactions.createdAt, start),
    lte(transactions.createdAt, end),
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
