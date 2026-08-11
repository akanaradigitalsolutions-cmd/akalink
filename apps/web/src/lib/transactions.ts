import "server-only";

import { and, desc, eq } from "drizzle-orm";
import {
  getDb,
  transactions,
  transactionItems,
  consumers,
  services,
} from "@akalink/db";

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
