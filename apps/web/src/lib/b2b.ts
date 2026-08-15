import "server-only";

import { and, desc, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";
import {
  getDb,
  b2bClients,
  invoices,
  consumers,
  transactions,
} from "@akalink/db";

export type B2bClientRow = {
  id: string;
  perusahaan: string;
  pic: string | null;
  telepon: string | null;
  terminHari: number;
  aktif: boolean;
  jumlahKonsumen: number;
  outstanding: number;
};

/** Daftar klien B2B + ringkasan piutang tertunggak (belum ditagihkan). */
export async function getB2bClients(tenantId: string): Promise<B2bClientRow[]> {
  const db = getDb();
  const clients = await db
    .select()
    .from(b2bClients)
    .where(eq(b2bClients.tenantId, tenantId))
    .orderBy(b2bClients.perusahaan);
  if (clients.length === 0) return [];

  // Konsumen tertaut per klien.
  const linked = await db
    .select({ id: consumers.id, b2bClientId: consumers.b2bClientId })
    .from(consumers)
    .where(
      and(eq(consumers.tenantId, tenantId), isNotNull(consumers.b2bClientId)),
    );
  const consumersByClient = new Map<string, string[]>();
  for (const c of linked) {
    if (!c.b2bClientId) continue;
    const arr = consumersByClient.get(c.b2bClientId) ?? [];
    arr.push(c.id);
    consumersByClient.set(c.b2bClientId, arr);
  }

  // Transaksi belum ditagihkan & belum lunas untuk konsumen tertaut.
  const allIds = linked.map((c) => c.id);
  const outstandingByConsumer = new Map<string, number>();
  if (allIds.length > 0) {
    const txs = await db
      .select({
        consumerId: transactions.consumerId,
        grandTotal: transactions.grandTotal,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          isNull(transactions.invoiceId),
          ne(transactions.statusPembayaran, "lunas"),
          inArray(transactions.consumerId, allIds),
        ),
      );
    for (const t of txs) {
      if (!t.consumerId) continue;
      outstandingByConsumer.set(
        t.consumerId,
        (outstandingByConsumer.get(t.consumerId) ?? 0) + Number(t.grandTotal),
      );
    }
  }

  return clients.map((cl) => {
    const cids = consumersByClient.get(cl.id) ?? [];
    const outstanding = cids.reduce(
      (s, cid) => s + (outstandingByConsumer.get(cid) ?? 0),
      0,
    );
    return {
      id: cl.id,
      perusahaan: cl.perusahaan,
      pic: cl.pic,
      telepon: cl.telepon,
      terminHari: cl.terminHari,
      aktif: cl.aktif,
      jumlahKonsumen: cids.length,
      outstanding: Math.round(outstanding),
    };
  });
}

export async function getB2bClientDetail(tenantId: string, id: string) {
  const db = getDb();
  const [client] = await db
    .select()
    .from(b2bClients)
    .where(and(eq(b2bClients.id, id), eq(b2bClients.tenantId, tenantId)))
    .limit(1);
  if (!client) return null;

  const linkedConsumers = await db
    .select({ id: consumers.id, nama: consumers.nama, hp: consumers.hp })
    .from(consumers)
    .where(
      and(eq(consumers.tenantId, tenantId), eq(consumers.b2bClientId, id)),
    )
    .orderBy(consumers.nama);

  const cids = linkedConsumers.map((c) => c.id);
  let outstandingTx: {
    id: string;
    noNota: string;
    tanggal: string;
    konsumen: string | null;
    grandTotal: number;
  }[] = [];
  if (cids.length > 0) {
    const rows = await db
      .select({
        id: transactions.id,
        noNota: transactions.noNota,
        tanggal: transactions.orderDiterima,
        grandTotal: transactions.grandTotal,
        konsumen: consumers.nama,
      })
      .from(transactions)
      .leftJoin(consumers, eq(transactions.consumerId, consumers.id))
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          isNull(transactions.invoiceId),
          ne(transactions.statusPembayaran, "lunas"),
          inArray(transactions.consumerId, cids),
        ),
      )
      .orderBy(desc(transactions.orderDiterima));
    outstandingTx = rows.map((r) => ({
      id: r.id,
      noNota: r.noNota,
      tanggal: r.tanggal.toISOString(),
      konsumen: r.konsumen,
      grandTotal: Math.round(Number(r.grandTotal)),
    }));
  }

  const invoiceList = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.tenantId, tenantId), eq(invoices.b2bClientId, id)))
    .orderBy(desc(invoices.tanggalTerbit));

  return {
    client,
    linkedConsumers,
    outstandingTx,
    invoices: invoiceList,
    outstandingTotal: outstandingTx.reduce((s, t) => s + t.grandTotal, 0),
  };
}

export async function getInvoiceDetail(tenantId: string, id: string) {
  const db = getDb();
  const [inv] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
    .limit(1);
  if (!inv) return null;
  const [client] = await db
    .select()
    .from(b2bClients)
    .where(eq(b2bClients.id, inv.b2bClientId))
    .limit(1);
  const items = await db
    .select({
      id: transactions.id,
      noNota: transactions.noNota,
      tanggal: transactions.orderDiterima,
      grandTotal: transactions.grandTotal,
      konsumen: consumers.nama,
    })
    .from(transactions)
    .leftJoin(consumers, eq(transactions.consumerId, consumers.id))
    .where(
      and(eq(transactions.tenantId, tenantId), eq(transactions.invoiceId, id)),
    )
    .orderBy(desc(transactions.orderDiterima));
  return {
    invoice: inv,
    client,
    items: items.map((r) => ({
      id: r.id,
      noNota: r.noNota,
      tanggal: r.tanggal.toISOString(),
      konsumen: r.konsumen,
      grandTotal: Math.round(Number(r.grandTotal)),
    })),
  };
}

/** Konsumen yang belum tertaut ke klien B2B mana pun (untuk dropdown tautan). */
export async function getUnlinkedConsumers(tenantId: string, limit = 100) {
  const db = getDb();
  return db
    .select({ id: consumers.id, nama: consumers.nama, hp: consumers.hp })
    .from(consumers)
    .where(
      and(eq(consumers.tenantId, tenantId), isNull(consumers.b2bClientId)),
    )
    .orderBy(desc(consumers.createdAt))
    .limit(limit);
}
