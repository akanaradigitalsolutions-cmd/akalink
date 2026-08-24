import "server-only";

import { and, eq, gte, lt, ne, notInArray, sql } from "drizzle-orm";
import { getDb, transactions } from "@akalink/db";

// Zona waktu aplikasi (WITA/Bali). TODO: jadikan pengaturan per-outlet.
const APP_TZ = "Asia/Makassar";

/** Awal hari ini menurut zona waktu aplikasi, sebagai instan UTC. */
function startOfToday(): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${ymd}T00:00:00+08:00`);
}

export async function getDashboardStats(tenantId: string, outletId?: string) {
  const db = getDb();
  const start = startOfToday();
  const now = new Date();

  const outletCond = outletId
    ? eq(transactions.outletId, outletId)
    : undefined;

  const [today] = await db
    .select({
      jumlah: sql<number>`count(*)::int`,
      omzet: sql<number>`coalesce(sum(${transactions.grandTotal}),0)::float8`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.tenantId, tenantId),
        gte(transactions.createdAt, start),
        outletCond,
      ),
    );

  const [unpaid] = await db
    .select({
      jumlah: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${transactions.grandTotal}),0)::float8`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.tenantId, tenantId),
        ne(transactions.statusPembayaran, "lunas"),
        outletCond,
      ),
    );

  const [late] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(transactions)
    .where(
      and(
        eq(transactions.tenantId, tenantId),
        lt(transactions.estimasiSelesai, now),
        notInArray(transactions.statusPekerjaan, ["selesai", "diambil"]),
        outletCond,
      ),
    );

  const statusRows = await db
    .select({
      status: transactions.statusPekerjaan,
      n: sql<number>`count(*)::int`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.tenantId, tenantId),
        notInArray(transactions.statusPekerjaan, ["diambil"]),
        outletCond,
      ),
    )
    .groupBy(transactions.statusPekerjaan);

  const kerja: Record<string, number> = {
    belum_dikerjakan: 0,
    proses: 0,
    selesai: 0,
  };
  for (const r of statusRows) {
    if (r.status in kerja) kerja[r.status] = r.n;
  }

  return {
    todayCount: today?.jumlah ?? 0,
    todayOmzet: today?.omzet ?? 0,
    unpaidCount: unpaid?.jumlah ?? 0,
    unpaidTotal: unpaid?.total ?? 0,
    lateCount: late?.n ?? 0,
    kerja,
  };
}

export type RevenueDay = { date: string; label: string; omzet: number };

/** Omzet 7 hari terakhir (termasuk hari ini), per hari, zona waktu aplikasi. */
export async function getRevenue7Days(
  tenantId: string,
  outletId?: string,
): Promise<RevenueDay[]> {
  const db = getDb();
  const startToday = startOfToday();
  const start = new Date(startToday.getTime() - 6 * 86400000);
  const outletCond = outletId ? eq(transactions.outletId, outletId) : undefined;

  const rows = await db
    .select({
      d: sql<string>`to_char((${transactions.createdAt} AT TIME ZONE ${APP_TZ})::date, 'YYYY-MM-DD')`,
      omzet: sql<number>`coalesce(sum(${transactions.grandTotal}),0)::float8`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.tenantId, tenantId),
        gte(transactions.createdAt, start),
        outletCond,
      ),
    )
    // Group by kolom pertama (ekspresi tanggal) via ordinal — hindari
    // ketidakcocokan ekspresi akibat parameter zona waktu yang terbind ganda.
    .groupBy(sql`1`);

  const map = new Map(rows.map((r) => [r.d, Number(r.omzet)]));
  const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const out: RevenueDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(startToday.getTime() - i * 86400000);
    const ymd = new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(day);
    // Nama hari singkat menurut zona aplikasi.
    const wd = new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TZ,
      weekday: "short",
    }).format(day);
    const idx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
    out.push({ date: ymd, label: idx >= 0 ? HARI[idx] : "", omzet: map.get(ymd) ?? 0 });
  }
  return out;
}
