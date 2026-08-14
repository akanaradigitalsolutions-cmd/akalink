import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb, appCoinLedger, tenants } from "@akalink/db";

/**
 * ============================================================================
 *  Saldo Koin AkaLink (monetisasi platform)
 * ----------------------------------------------------------------------------
 *  Setiap laundry punya "Saldo Koin" (dompet aplikasi, dalam Rupiah). Setiap
 *  Nota yang dibuat & setiap nota yang dikirim via WhatsApp memotong saldo.
 *  Isi ulang (top-up) menambah saldo (mis. lewat DOKU). Semua mutasi tercatat
 *  di `app_coin_ledger` agar bisa diaudit.
 * ============================================================================
 */

export type CoinConfig = {
  saldoKoin: number;
  biayaPerNota: number;
  biayaPerWa: number;
};

export type CoinLedgerRow = {
  id: string;
  tipe: "topup" | "pemakaian" | "bonus" | "penyesuaian";
  delta: number;
  saldoSesudah: number;
  keterangan: string | null;
  refType: string | null;
  createdAt: string;
};

/** Konfigurasi biaya + saldo koin milik tenant. */
export async function getCoinConfig(tenantId: string): Promise<CoinConfig> {
  const db = getDb();
  const [row] = await db
    .select({
      saldoKoin: tenants.saldoKoin,
      biayaPerNota: tenants.biayaPerNota,
      biayaPerWa: tenants.biayaPerWa,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return {
    saldoKoin: row?.saldoKoin ?? 0,
    biayaPerNota: row?.biayaPerNota ?? 50,
    biayaPerWa: row?.biayaPerWa ?? 50,
  };
}

/** Riwayat mutasi saldo koin (terbaru dulu). */
export async function getCoinLedger(
  tenantId: string,
  limit = 50,
): Promise<CoinLedgerRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: appCoinLedger.id,
      tipe: appCoinLedger.tipe,
      delta: appCoinLedger.delta,
      saldoSesudah: appCoinLedger.saldoSesudah,
      keterangan: appCoinLedger.keterangan,
      refType: appCoinLedger.refType,
      createdAt: appCoinLedger.createdAt,
    })
    .from(appCoinLedger)
    .where(eq(appCoinLedger.tenantId, tenantId))
    .orderBy(desc(appCoinLedger.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

type Exec = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/**
 * Terapkan mutasi saldo koin secara atomik. `exec` = db/transaksi Drizzle.
 * Mengunci baris tenant (FOR UPDATE) agar aman dari race antar-kasir.
 * Idempoten bila `refId` diberikan: mutasi dengan (tenant, refType, refId)
 * yang sama tidak diulang.
 *
 * `delta` bertanda: negatif = potong (pemakaian), positif = tambah (topup).
 * Saldo boleh menjadi negatif (utang) — operasional laundry tidak diblokir.
 */
async function applyCoin(
  exec: Exec,
  tenantId: string,
  opts: {
    delta: number;
    tipe: "topup" | "pemakaian" | "bonus" | "penyesuaian";
    keterangan: string;
    refType: string;
    refId?: string | null;
    createdBy?: string | null;
  },
): Promise<{ applied: boolean; saldoSesudah: number }> {
  // Idempotensi (hanya bila ada refId).
  if (opts.refId) {
    const [dup] = await exec
      .select({ saldoSesudah: appCoinLedger.saldoSesudah })
      .from(appCoinLedger)
      .where(
        and(
          eq(appCoinLedger.tenantId, tenantId),
          eq(appCoinLedger.refType, opts.refType),
          eq(appCoinLedger.refId, opts.refId),
        ),
      )
      .limit(1);
    if (dup) return { applied: false, saldoSesudah: dup.saldoSesudah };
  }

  const [t] = await exec
    .select({ saldoKoin: tenants.saldoKoin })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .for("update")
    .limit(1);
  const saldoSebelum = t?.saldoKoin ?? 0;
  const saldoSesudah = saldoSebelum + opts.delta;

  await exec
    .update(tenants)
    .set({ saldoKoin: saldoSesudah, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));

  await exec.insert(appCoinLedger).values({
    tenantId,
    tipe: opts.tipe,
    delta: opts.delta,
    saldoSesudah,
    keterangan: opts.keterangan,
    refType: opts.refType,
    refId: opts.refId ?? null,
    createdBy: opts.createdBy ?? null,
  });

  return { applied: true, saldoSesudah };
}

/** Potong saldo koin (pemakaian). `amount` positif = jumlah yang dipotong. */
export async function chargeAppCoin(
  exec: Exec,
  tenantId: string,
  opts: {
    amount: number;
    keterangan: string;
    refType: string;
    refId?: string | null;
    createdBy?: string | null;
  },
) {
  const amount = Math.max(0, Math.floor(opts.amount));
  if (amount === 0) return { applied: false, saldoSesudah: 0 };
  return applyCoin(exec, tenantId, {
    delta: -amount,
    tipe: "pemakaian",
    keterangan: opts.keterangan,
    refType: opts.refType,
    refId: opts.refId ?? null,
    createdBy: opts.createdBy ?? null,
  });
}

/** Tambah saldo koin (top-up / bonus / penyesuaian). */
export async function topupAppCoin(
  exec: Exec,
  tenantId: string,
  opts: {
    amount: number;
    keterangan: string;
    refType: string;
    refId?: string | null;
    tipe?: "topup" | "bonus" | "penyesuaian";
    createdBy?: string | null;
  },
) {
  const amount = Math.max(0, Math.floor(opts.amount));
  if (amount === 0) return { applied: false, saldoSesudah: 0 };
  return applyCoin(exec, tenantId, {
    delta: amount,
    tipe: opts.tipe ?? "topup",
    keterangan: opts.keterangan,
    refType: opts.refType,
    refId: opts.refId ?? null,
    createdBy: opts.createdBy ?? null,
  });
}
