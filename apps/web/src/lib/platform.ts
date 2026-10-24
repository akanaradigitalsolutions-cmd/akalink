import "server-only";

import { cache } from "react";
import { and, desc, eq, sql, inArray } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";
import {
  getDb,
  platformAdmins,
  tenants,
  outlets,
  transactions,
  employees,
  appCoinLedger,
  coinTopupOrders,
} from "@akalink/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Email admin platform dari env (fallback bila tabel belum di-seed). */
function envAdmins(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Apakah user adalah admin platform AkaLink (lintas-tenant). */
export const isPlatformAdmin = cache(async (user: User | null): Promise<boolean> => {
  const email = user?.email?.toLowerCase();
  if (!email) return false;
  if (envAdmins().includes(email)) return true;
  const db = getDb();
  const [row] = await db
    .select({ id: platformAdmins.id })
    .from(platformAdmins)
    .where(eq(platformAdmins.email, email))
    .limit(1);
  return !!row;
});

export type PlatformStats = {
  totalTenant: number;
  aktif: number;
  trial: number;
  suspended: number;
  totalSaldoKoin: number;
  totalKoinTerpakai: number; // pendapatan platform (pemakaian)
  totalTopup: number;
  totalTransaksi: number;
};

export async function getPlatformStats(): Promise<PlatformStats> {
  const db = getDb();
  const [tRows, coinRows, txCount] = await Promise.all([
    db
      .select({ status: tenants.status, saldo: tenants.saldoKoin })
      .from(tenants),
    db
      .select({
        tipe: appCoinLedger.tipe,
        total: sql<number>`coalesce(sum(${appCoinLedger.delta}),0)::float8`,
      })
      .from(appCoinLedger)
      .groupBy(appCoinLedger.tipe),
    db.select({ n: sql<number>`count(*)::int` }).from(transactions),
  ]);

  const totalSaldoKoin = tRows.reduce((s, r) => s + (r.saldo ?? 0), 0);
  let terpakai = 0;
  let topup = 0;
  for (const c of coinRows) {
    if (c.tipe === "pemakaian") terpakai += Math.abs(c.total);
    if (c.tipe === "topup" || c.tipe === "bonus") topup += c.total;
  }

  return {
    totalTenant: tRows.length,
    aktif: tRows.filter((r) => r.status === "active").length,
    trial: tRows.filter((r) => r.status === "trial").length,
    suspended: tRows.filter((r) => r.status === "suspended").length,
    totalSaldoKoin,
    totalKoinTerpakai: Math.round(terpakai),
    totalTopup: Math.round(topup),
    totalTransaksi: txCount[0]?.n ?? 0,
  };
}

export type TenantOverview = {
  id: string;
  nama: string;
  kota: string | null;
  status: string;
  tier: string;
  saldoKoin: number;
  biayaPerNota: number;
  outletCount: number;
  txCount: number;
  ownerEmail: string | null;
  createdAt: string;
};

/** Peta authUserId → email dari Supabase Auth (semua user, dipaginasi). */
async function allUserEmails(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const admin = createSupabaseAdminClient();
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (error || !data?.users?.length) break;
      for (const u of data.users) if (u.email) map.set(u.id, u.email);
      if (data.users.length < 1000) break;
    }
  } catch {
    // Bila gagal ambil email, tetap tampilkan data tenant tanpa email.
  }
  return map;
}

/** Peta tenantId → email pemilik (owner). */
async function ownerEmailByTenant(ids: string[]): Promise<Map<string, string>> {
  const db = getDb();
  const owners = await db
    .select({ tenantId: employees.tenantId, authUserId: employees.authUserId })
    .from(employees)
    .where(and(inArray(employees.tenantId, ids), eq(employees.role, "owner")));
  const emails = await allUserEmails();
  const out = new Map<string, string>();
  for (const o of owners) {
    if (o.authUserId && emails.has(o.authUserId)) {
      // Pakai email pemilik pertama yang ditemukan per tenant.
      if (!out.has(o.tenantId)) out.set(o.tenantId, emails.get(o.authUserId)!);
    }
  }
  return out;
}

export async function getAllTenants(): Promise<TenantOverview[]> {
  const db = getDb();
  const rows = await db.select().from(tenants).orderBy(desc(tenants.createdAt));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [outletRows, txRows] = await Promise.all([
    db
      .select({ tenantId: outlets.tenantId, n: sql<number>`count(*)::int` })
      .from(outlets)
      .where(inArray(outlets.tenantId, ids))
      .groupBy(outlets.tenantId),
    db
      .select({ tenantId: transactions.tenantId, n: sql<number>`count(*)::int` })
      .from(transactions)
      .where(inArray(transactions.tenantId, ids))
      .groupBy(transactions.tenantId),
  ]);
  const outletMap = new Map(outletRows.map((r) => [r.tenantId, r.n]));
  const txMap = new Map(txRows.map((r) => [r.tenantId, r.n]));
  const emailMap = await ownerEmailByTenant(ids);

  return rows.map((r) => ({
    id: r.id,
    nama: r.nama,
    kota: r.kota,
    status: r.status,
    tier: r.tier,
    saldoKoin: r.saldoKoin,
    biayaPerNota: r.biayaPerNota,
    outletCount: outletMap.get(r.id) ?? 0,
    txCount: txMap.get(r.id) ?? 0,
    ownerEmail: emailMap.get(r.id) ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getTenantAdminDetail(id: string) {
  const db = getDb();
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) return null;

  const [ledger, coinAgg, txAgg] = await Promise.all([
    db
      .select({
        id: appCoinLedger.id,
        tipe: appCoinLedger.tipe,
        delta: appCoinLedger.delta,
        saldoSesudah: appCoinLedger.saldoSesudah,
        keterangan: appCoinLedger.keterangan,
        createdAt: appCoinLedger.createdAt,
      })
      .from(appCoinLedger)
      .where(eq(appCoinLedger.tenantId, id))
      .orderBy(desc(appCoinLedger.createdAt))
      .limit(40),
    db
      .select({
        tipe: appCoinLedger.tipe,
        total: sql<number>`coalesce(sum(${appCoinLedger.delta}),0)::float8`,
      })
      .from(appCoinLedger)
      .where(eq(appCoinLedger.tenantId, id))
      .groupBy(appCoinLedger.tipe),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(transactions)
      .where(eq(transactions.tenantId, id)),
  ]);

  let terpakai = 0;
  for (const c of coinAgg) if (c.tipe === "pemakaian") terpakai += Math.abs(c.total);

  const ownerEmail = (await ownerEmailByTenant([id])).get(id) ?? null;

  return {
    tenant,
    ownerEmail,
    ledger: ledger.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
    koinTerpakai: Math.round(terpakai),
    txCount: txAgg[0]?.n ?? 0,
  };
}

// --- Monitor isi ulang Saldo Koin (lintas-tenant) -------------------------
export type CoinTopupStatus = "pending" | "success" | "failed" | "expired";

export type CoinTopupRow = {
  id: string;
  tenantId: string;
  tenantNama: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  channel: string | null;
  createdAt: Date;
  paidAt: Date | null;
};

/** Daftar pesanan isi ulang koin seluruh laundry (opsional difilter status). */
export async function getAllCoinTopups(opts?: {
  status?: CoinTopupStatus;
  limit?: number;
}): Promise<CoinTopupRow[]> {
  const db = getDb();
  const limit = Math.min(opts?.limit ?? 200, 500);
  const where = opts?.status
    ? eq(coinTopupOrders.status, opts.status)
    : undefined;
  return db
    .select({
      id: coinTopupOrders.id,
      tenantId: coinTopupOrders.tenantId,
      tenantNama: tenants.nama,
      invoiceNumber: coinTopupOrders.invoiceNumber,
      amount: coinTopupOrders.amount,
      status: coinTopupOrders.status,
      channel: coinTopupOrders.channel,
      createdAt: coinTopupOrders.createdAt,
      paidAt: coinTopupOrders.paidAt,
    })
    .from(coinTopupOrders)
    .innerJoin(tenants, eq(coinTopupOrders.tenantId, tenants.id))
    .where(where)
    .orderBy(desc(coinTopupOrders.createdAt))
    .limit(limit);
}

export type TopupSummary = {
  successCount: number;
  successTotal: number;
  pendingCount: number;
  pendingTotal: number;
  failedCount: number;
  failedTotal: number;
};

/** Ringkasan isi ulang koin per status (seluruh platform). */
export async function getTopupSummary(): Promise<TopupSummary> {
  const db = getDb();
  const rows = await db
    .select({
      status: coinTopupOrders.status,
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${coinTopupOrders.amount}),0)::float8`,
    })
    .from(coinTopupOrders)
    .groupBy(coinTopupOrders.status);

  const s: TopupSummary = {
    successCount: 0,
    successTotal: 0,
    pendingCount: 0,
    pendingTotal: 0,
    failedCount: 0,
    failedTotal: 0,
  };
  for (const r of rows) {
    if (r.status === "success") {
      s.successCount = r.count;
      s.successTotal = Math.round(r.total);
    } else if (r.status === "pending") {
      s.pendingCount = r.count;
      s.pendingTotal = Math.round(r.total);
    } else {
      // failed + expired digabung sebagai "gagal"
      s.failedCount += r.count;
      s.failedTotal += Math.round(r.total);
    }
  }
  return s;
}

/** Daftar email admin platform (dari env) — dipakai untuk proteksi hapus. */
export function platformAdminEmails(): string[] {
  return envAdmins();
}

// --- Analitik platform (6 bulan terakhir) ---------------------------------
export type MonthPoint = {
  bulan: string; // YYYY-MM
  nota: number;
  koinTerpakai: number;
  topup: number;
};

export async function getPlatformAnalytics(months = 6): Promise<MonthPoint[]> {
  const db = getDb();
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const mTx = sql<string>`to_char(${transactions.createdAt} AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM')`;
  const mCoin = sql<string>`to_char(${appCoinLedger.createdAt} AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM')`;
  const mTop = sql<string>`to_char(${coinTopupOrders.createdAt} AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM')`;

  const [notaRows, coinRows, topRows] = await Promise.all([
    db
      .select({ bulan: mTx, n: sql<number>`count(*)::int` })
      .from(transactions)
      .groupBy(mTx),
    db
      .select({
        bulan: mCoin,
        total: sql<number>`coalesce(sum(case when ${appCoinLedger.tipe}='pemakaian' then abs(${appCoinLedger.delta}) else 0 end),0)::float8`,
      })
      .from(appCoinLedger)
      .groupBy(mCoin),
    db
      .select({
        bulan: mTop,
        total: sql<number>`coalesce(sum(case when ${coinTopupOrders.status}='success' then ${coinTopupOrders.amount} else 0 end),0)::float8`,
      })
      .from(coinTopupOrders)
      .groupBy(mTop),
  ]);

  const notaMap = new Map(notaRows.map((r) => [r.bulan, r.n]));
  const coinMap = new Map(coinRows.map((r) => [r.bulan, Math.round(r.total)]));
  const topMap = new Map(topRows.map((r) => [r.bulan, Math.round(r.total)]));

  return keys.map((k) => ({
    bulan: k,
    nota: notaMap.get(k) ?? 0,
    koinTerpakai: coinMap.get(k) ?? 0,
    topup: topMap.get(k) ?? 0,
  }));
}
