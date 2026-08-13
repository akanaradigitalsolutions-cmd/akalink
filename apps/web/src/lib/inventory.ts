import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb, inventoryItems, inventoryMovements } from "@akalink/db";

export type InvItem = {
  id: string;
  nama: string;
  satuan: string;
  stok: string;
  harga: string;
  minStok: string;
  aktif: boolean;
};

/** Daftar bahan inventori untuk sebuah outlet. */
export async function getInventory(
  tenantId: string,
  outletId: string,
): Promise<InvItem[]> {
  const db = getDb();
  return db
    .select({
      id: inventoryItems.id,
      nama: inventoryItems.nama,
      satuan: inventoryItems.satuan,
      stok: inventoryItems.stok,
      harga: inventoryItems.harga,
      minStok: inventoryItems.minStok,
      aktif: inventoryItems.aktif,
    })
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.tenantId, tenantId),
        eq(inventoryItems.outletId, outletId),
      ),
    )
    .orderBy(inventoryItems.nama);
}

export type InvMovement = {
  id: string;
  tipe: string;
  qtyDelta: string;
  saldoSesudah: string;
  keterangan: string | null;
  createdAt: Date;
  itemNama: string | null;
  satuan: string | null;
};

/** Riwayat pergerakan stok terbaru untuk sebuah outlet. */
export async function getRecentMovements(
  tenantId: string,
  outletId: string,
  limit = 25,
): Promise<InvMovement[]> {
  const db = getDb();
  return db
    .select({
      id: inventoryMovements.id,
      tipe: inventoryMovements.tipe,
      qtyDelta: inventoryMovements.qtyDelta,
      saldoSesudah: inventoryMovements.saldoSesudah,
      keterangan: inventoryMovements.keterangan,
      createdAt: inventoryMovements.createdAt,
      itemNama: inventoryItems.nama,
      satuan: inventoryItems.satuan,
    })
    .from(inventoryMovements)
    .leftJoin(
      inventoryItems,
      eq(inventoryMovements.itemId, inventoryItems.id),
    )
    .where(
      and(
        eq(inventoryMovements.tenantId, tenantId),
        eq(inventoryMovements.outletId, outletId),
      ),
    )
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(limit);
}
