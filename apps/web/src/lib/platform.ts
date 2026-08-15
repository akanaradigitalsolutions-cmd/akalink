import "server-only";

import { cache } from "react";
import { desc, eq, sql, inArray } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";
import {
  getDb,
  platformAdmins,
  tenants,
  outlets,
  transactions,
  appCoinLedger,
} from "@akalink/db";

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
  createdAt: string;
};

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

  return {
    tenant,
    ledger: ledger.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
    koinTerpakai: Math.round(terpakai),
    txCount: txAgg[0]?.n ?? 0,
  };
}
