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

export async function getDashboardStats(tenantId: string) {
  const db = getDb();
  const start = startOfToday();
  const now = new Date();

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
