import "server-only";

import { cache } from "react";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import {
  getDb,
  transactions,
  transactionItems,
  consumers,
  services,
  tenants,
  outlets,
} from "@akalink/db";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const WORK_STATUSES = [
  "belum_dikerjakan",
  "proses",
  "selesai",
  "diambil",
] as const;
const PAY_STATUSES = ["belum_dibayar", "dp", "lunas"] as const;
type WorkStatus = (typeof WORK_STATUSES)[number];
type PayStatus = (typeof PAY_STATUSES)[number];

/** Layanan aktif (untuk dipilih di POS). */
export async function getActiveServices(tenantId: string) {
  const db = getDb();
  return db
    .select()
    .from(services)
    .where(and(eq(services.tenantId, tenantId), eq(services.aktif, true)))
    .orderBy(services.nama);
}

/** Transaksi terbaru + nama konsumen. */
export async function getRecentTransactions(tenantId: string, limit = 30) {
  const db = getDb();
  return db
    .select({
      id: transactions.id,
      noNota: transactions.noNota,
      grandTotal: transactions.grandTotal,
      statusPekerjaan: transactions.statusPekerjaan,
      statusPembayaran: transactions.statusPembayaran,
      isExpress: transactions.isExpress,
      orderDiterima: transactions.orderDiterima,
      consumerNama: consumers.nama,
    })
    .from(transactions)
    .leftJoin(consumers, eq(transactions.consumerId, consumers.id))
    .where(eq(transactions.tenantId, tenantId))
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
}

/** Transaksi dengan pencarian teks (nota/konsumen) + filter status. */
export async function searchTransactions(
  tenantId: string,
  opts: {
    q?: string;
    kerja?: string;
    bayar?: string;
    outlet?: string;
    limit?: number;
  } = {},
) {
  const db = getDb();
  const conds: SQL[] = [eq(transactions.tenantId, tenantId)];

  const q = (opts.q ?? "").trim();
  if (q) {
    const like = `%${q}%`;
    const cond = or(
      ilike(transactions.noNota, like),
      ilike(consumers.nama, like),
    );
    if (cond) conds.push(cond);
  }
  if (WORK_STATUSES.includes(opts.kerja as WorkStatus))
    conds.push(eq(transactions.statusPekerjaan, opts.kerja as WorkStatus));
  if (PAY_STATUSES.includes(opts.bayar as PayStatus))
    conds.push(eq(transactions.statusPembayaran, opts.bayar as PayStatus));
  if (opts.outlet && UUID_RE.test(opts.outlet))
    conds.push(eq(transactions.outletId, opts.outlet));

  return db
    .select({
      id: transactions.id,
      noNota: transactions.noNota,
      grandTotal: transactions.grandTotal,
      statusPekerjaan: transactions.statusPekerjaan,
      statusPembayaran: transactions.statusPembayaran,
      isExpress: transactions.isExpress,
      orderDiterima: transactions.orderDiterima,
      consumerNama: consumers.nama,
      outletNama: outlets.nama,
    })
    .from(transactions)
    .leftJoin(consumers, eq(transactions.consumerId, consumers.id))
    .leftJoin(outlets, eq(transactions.outletId, outlets.id))
    .where(and(...conds))
    .orderBy(desc(transactions.createdAt))
    .limit(opts.limit ?? 50);
}

/** Satu transaksi lengkap dengan item + data konsumen. */
export async function getTransactionWithItems(tenantId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(transactions)
    .leftJoin(consumers, eq(transactions.consumerId, consumers.id))
    .where(and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)))
    .limit(1);

  if (!row) return null;

  const items = await db
    .select()
    .from(transactionItems)
    .where(eq(transactionItems.transactionId, id))
    .orderBy(transactionItems.createdAt);

  return { tx: row.transactions, consumer: row.consumers, items };
}

/**
 * Ambil transaksi berdasarkan id SAJA (untuk halaman nota publik / QR).
 * Tidak dibatasi tenant — id UUID bersifat rahasia (tidak bisa ditebak).
 */
export const getPublicTransaction = cache(async (id: string) => {
  if (!UUID_RE.test(id)) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(transactions)
    .leftJoin(consumers, eq(transactions.consumerId, consumers.id))
    .leftJoin(tenants, eq(transactions.tenantId, tenants.id))
    .where(eq(transactions.id, id))
    .limit(1);

  if (!row) return null;

  const items = await db
    .select()
    .from(transactionItems)
    .where(eq(transactionItems.transactionId, id))
    .orderBy(transactionItems.createdAt);

  return {
    tx: row.transactions,
    consumer: row.consumers,
    tenant: row.tenants,
    items,
  };
});
