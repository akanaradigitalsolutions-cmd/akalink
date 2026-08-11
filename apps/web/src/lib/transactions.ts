import "server-only";

import { and, desc, eq } from "drizzle-orm";
import {
  getDb,
  transactions,
  transactionItems,
  consumers,
  services,
  tenants,
} from "@akalink/db";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
export async function getPublicTransaction(id: string) {
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
}
