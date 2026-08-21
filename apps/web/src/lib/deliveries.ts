import "server-only";

import { and, desc, eq } from "drizzle-orm";
import {
  getDb,
  deliveries,
  consumers,
  employees,
  transactions,
} from "@akalink/db";

export type DeliveryRow = {
  id: string;
  tipe: "jemput" | "antar";
  status: "menunggu" | "dijadwalkan" | "dalam_perjalanan" | "selesai" | "batal";
  alamat: string;
  kontak: string | null;
  hp: string | null;
  jadwal: string | null;
  biayaAntar: number;
  catatan: string | null;
  kurirId: string | null;
  kurirNama: string | null;
  konsumenNama: string | null;
  noNota: string | null;
  createdAt: string;
};

export async function getDeliveries(
  tenantId: string,
  limit = 50,
  outletId?: string | null,
): Promise<DeliveryRow[]> {
  const db = getDb();
  const kurir = employees;
  const where = outletId
    ? and(eq(deliveries.tenantId, tenantId), eq(deliveries.outletId, outletId))
    : eq(deliveries.tenantId, tenantId);
  const rows = await db
    .select({
      id: deliveries.id,
      tipe: deliveries.tipe,
      status: deliveries.status,
      alamat: deliveries.alamat,
      kontakNama: deliveries.kontakNama,
      kontakHp: deliveries.kontakHp,
      jadwal: deliveries.jadwal,
      biayaAntar: deliveries.biayaAntar,
      catatan: deliveries.catatan,
      kurirId: deliveries.kurirId,
      kurirNama: kurir.nama,
      konsumenNama: consumers.nama,
      konsumenHp: consumers.hp,
      noNota: transactions.noNota,
      createdAt: deliveries.createdAt,
    })
    .from(deliveries)
    .leftJoin(consumers, eq(deliveries.consumerId, consumers.id))
    .leftJoin(kurir, eq(deliveries.kurirId, kurir.id))
    .leftJoin(transactions, eq(deliveries.transactionId, transactions.id))
    .where(where)
    .orderBy(desc(deliveries.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    tipe: r.tipe,
    status: r.status,
    alamat: r.alamat,
    kontak: r.konsumenNama ?? r.kontakNama,
    hp: r.konsumenHp ?? r.kontakHp,
    jadwal: r.jadwal ? r.jadwal.toISOString() : null,
    biayaAntar: r.biayaAntar,
    catatan: r.catatan,
    kurirId: r.kurirId,
    kurirNama: r.kurirNama,
    konsumenNama: r.konsumenNama,
    noNota: r.noNota,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getDelivery(tenantId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(deliveries)
    .where(and(eq(deliveries.id, id), eq(deliveries.tenantId, tenantId)))
    .limit(1);
  return row ?? null;
}
