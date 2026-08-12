import "server-only";

import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { getDb, consumers, transactions } from "@akalink/db";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cari konsumen berdasarkan nama atau nomor HP (maks 25 hasil). */
export async function searchConsumers(tenantId: string, q: string) {
  const db = getDb();
  const term = `%${q}%`;
  return db
    .select()
    .from(consumers)
    .where(
      and(
        eq(consumers.tenantId, tenantId),
        or(ilike(consumers.nama, term), ilike(consumers.hp, term)),
      ),
    )
    .orderBy(desc(consumers.createdAt))
    .limit(25);
}

/** Ambil konsumen terbaru (default ketika belum ada pencarian). */
export async function getRecentConsumers(tenantId: string, limit = 25) {
  const db = getDb();
  return db
    .select()
    .from(consumers)
    .where(eq(consumers.tenantId, tenantId))
    .orderBy(desc(consumers.createdAt))
    .limit(limit);
}

/** Detail satu konsumen + ringkasan & riwayat transaksinya. */
export async function getConsumerDetail(tenantId: string, id: string) {
  if (!UUID_RE.test(id)) return null;
  const db = getDb();

  const [c] = await db
    .select()
    .from(consumers)
    .where(and(eq(consumers.id, id), eq(consumers.tenantId, tenantId)))
    .limit(1);
  if (!c) return null;

  const cond = and(
    eq(transactions.tenantId, tenantId),
    eq(transactions.consumerId, id),
  );

  const [agg] = await db
    .select({
      jumlah: sql<number>`count(*)::int`,
      belanja: sql<number>`coalesce(sum(${transactions.grandTotal}),0)::float8`,
    })
    .from(transactions)
    .where(cond);

  const [piutangRow] = await db
    .select({
      piutang: sql<number>`coalesce(sum(${transactions.grandTotal}),0)::float8`,
    })
    .from(transactions)
    .where(and(cond, ne(transactions.statusPembayaran, "lunas")));

  const txs = await db
    .select({
      id: transactions.id,
      noNota: transactions.noNota,
      grandTotal: transactions.grandTotal,
      statusPekerjaan: transactions.statusPekerjaan,
      statusPembayaran: transactions.statusPembayaran,
      isExpress: transactions.isExpress,
      orderDiterima: transactions.orderDiterima,
    })
    .from(transactions)
    .where(cond)
    .orderBy(desc(transactions.createdAt))
    .limit(100);

  return {
    consumer: c,
    jumlah: agg?.jumlah ?? 0,
    belanja: agg?.belanja ?? 0,
    piutang: piutangRow?.piutang ?? 0,
    txs,
  };
}

/** Hitung total konsumen milik tenant. */
export async function countConsumers(tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(consumers)
    .where(eq(consumers.tenantId, tenantId));
  return row?.n ?? 0;
}
