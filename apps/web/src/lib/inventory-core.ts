import "server-only";

import { and, eq } from "drizzle-orm";
import {
  getDb,
  inventoryItems,
  inventoryMovements,
  suppliers,
} from "@akalink/db";
import { seedDefaultCoaIfEmpty } from "@/lib/coa";
import { postJournal } from "@/lib/journal";

export type BuyStockPayload = {
  itemId: string;
  qty: number;
  totalHarga: number;
  kasKode: string; // kode akun kas / "HUTANG"
  supplierId?: string | null;
  keterangan?: string;
};

/**
 * Eksekusi pembelian stok (dipakai langsung oleh pemilik & saat pemilik
 * menyetujui permintaan staf). Menambah stok + jurnal
 *   Dr 1.3 Persediaan / Cr Kas (tunai) atau Cr 2.1 Hutang (kredit).
 */
export async function executeBuyStock(
  tenantId: string,
  outletId: string | null,
  userId: string | null,
  p: BuyStockPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const qty = Number(p.qty);
  const total = Number(p.totalHarga);
  const kas = String(p.kasKode ?? "");
  if (!(qty > 0)) return { ok: false, error: "Jumlah harus lebih dari 0." };
  if (!(total >= 0)) return { ok: false, error: "Total harga tidak valid." };
  if (!kas) return { ok: false, error: "Pilih metode pembayaran." };
  const kredit = kas === "HUTANG";

  const db = getDb();
  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, p.itemId), eq(inventoryItems.tenantId, tenantId)))
    .limit(1);
  if (!item) return { ok: false, error: "Bahan tidak ditemukan." };

  let supplierId: string | null = null;
  if (p.supplierId) {
    const [s] = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(and(eq(suppliers.id, p.supplierId), eq(suppliers.tenantId, tenantId)))
      .limit(1);
    supplierId = s?.id ?? null;
  }

  const unit = qty > 0 ? total / qty : 0;
  const saldo = Number(item.stok) + qty;

  await seedDefaultCoaIfEmpty(tenantId);
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(inventoryItems)
        .set({ stok: String(saldo), harga: String(unit), updatedAt: new Date() })
        .where(eq(inventoryItems.id, item.id));
      await tx.insert(inventoryMovements).values({
        tenantId,
        outletId: outletId ?? item.outletId,
        itemId: item.id,
        supplierId,
        tipe: "pembelian",
        qtyDelta: String(qty),
        hargaSatuan: String(unit),
        saldoSesudah: String(saldo),
        keterangan:
          p.keterangan?.trim() || `Beli ${item.nama}${kredit ? " (kredit)" : ""}`,
        createdBy: userId,
      });
      if (total > 0) {
        await postJournal(tx, tenantId, {
          keterangan: `Pembelian stok: ${item.nama}`,
          refType: "inventori_beli",
          refId: item.id,
          lines: [
            { kode: "1.3", debit: total },
            { kode: kredit ? "2.1" : kas, kredit: total },
          ],
        });
      }
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan." };
  }
  return { ok: true };
}
