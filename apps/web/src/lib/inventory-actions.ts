"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import {
  getDb,
  inventoryItems,
  inventoryMovements,
  suppliers,
  outlets,
  approvals,
  employees,
} from "@akalink/db";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getActiveOutlet, seedDefaultOutletIfEmpty } from "@/lib/outlets";
import { seedDefaultCoaIfEmpty } from "@/lib/coa";
import { postJournal } from "@/lib/journal";
import { executeBuyStock } from "@/lib/inventory-core";

export type InvResult =
  | { ok: true; pending?: boolean }
  | { ok: false; error: string };

type Ctx = { tenantId: string; outletId: string; userId: string };

async function ctx(): Promise<Ctx | { error: string }> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return { error: "Sesi tidak valid." };
  await seedDefaultOutletIfEmpty(tenantId);
  const outlet = await getActiveOutlet(tenantId);
  if (!outlet) return { error: "Outlet tidak ditemukan." };
  return { tenantId, outletId: outlet.id, userId: user.id };
}

const num = (v: unknown) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

function revalidate() {
  revalidatePath("/inventori");
  revalidatePath("/keuangan/jurnal");
  revalidatePath("/keuangan/buku-besar");
  revalidatePath("/keuangan/laba-rugi");
  revalidatePath("/keuangan/neraca");
}

export async function createItem(input: {
  nama: string;
  satuan: string;
  minStok?: number | string;
  stokAwal?: number | string;
  harga?: number | string;
}): Promise<InvResult> {
  const c = await ctx();
  if ("error" in c) return { ok: false, error: c.error };

  const nama = String(input.nama ?? "").trim();
  if (nama.length < 2) return { ok: false, error: "Nama bahan wajib diisi." };
  const satuan = String(input.satuan ?? "pcs").trim() || "pcs";
  const minStok = Math.max(0, num(input.minStok ?? 0) || 0);
  const stokAwal = Math.max(0, num(input.stokAwal ?? 0) || 0);
  const harga = Math.max(0, num(input.harga ?? 0) || 0);

  const db = getDb();
  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(inventoryItems)
      .values({
        tenantId: c.tenantId,
        outletId: c.outletId,
        nama,
        satuan,
        minStok: String(minStok),
        harga: String(harga),
        stok: String(stokAwal),
      })
      .returning({ id: inventoryItems.id });
    // Stok awal dicatat sebagai penyesuaian (saldo pembuka, tanpa jurnal).
    if (stokAwal > 0) {
      await tx.insert(inventoryMovements).values({
        tenantId: c.tenantId,
        outletId: c.outletId,
        itemId: row.id,
        tipe: "penyesuaian",
        qtyDelta: String(stokAwal),
        hargaSatuan: String(harga),
        saldoSesudah: String(stokAwal),
        keterangan: "Stok awal",
        createdBy: c.userId,
      });
    }
  });

  revalidatePath("/inventori");
  return { ok: true };
}

export async function updateItem(input: {
  id: string;
  nama: string;
  satuan: string;
  minStok?: number | string;
  aktif?: boolean;
}): Promise<InvResult> {
  const c = await ctx();
  if ("error" in c) return { ok: false, error: c.error };
  const nama = String(input.nama ?? "").trim();
  if (nama.length < 2) return { ok: false, error: "Nama bahan wajib diisi." };

  const db = getDb();
  await db
    .update(inventoryItems)
    .set({
      nama,
      satuan: String(input.satuan ?? "pcs").trim() || "pcs",
      minStok: String(Math.max(0, num(input.minStok ?? 0) || 0)),
      aktif: input.aktif ?? true,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(inventoryItems.id, input.id),
        eq(inventoryItems.tenantId, c.tenantId),
      ),
    );
  revalidatePath("/inventori");
  return { ok: true };
}

export async function deleteItem(input: { id: string }): Promise<InvResult> {
  const c = await ctx();
  if ("error" in c) return { ok: false, error: c.error };
  const db = getDb();
  await db
    .delete(inventoryItems)
    .where(
      and(
        eq(inventoryItems.id, input.id),
        eq(inventoryItems.tenantId, c.tenantId),
      ),
    );
  revalidatePath("/inventori");
  return { ok: true };
}

async function loadItem(c: Ctx, id: string) {
  const db = getDb();
  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(
      and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, c.tenantId)),
    )
    .limit(1);
  return item;
}

/**
 * Beli stok → stok bertambah + jurnal Dr Persediaan / Cr Kas (atau Hutang).
 * `kasKode` = "HUTANG" berarti beli kredit (Cr Hutang Usaha 2.1).
 */
export async function buyStock(input: {
  itemId: string;
  qty: number | string;
  totalHarga: number | string;
  kasKode: string;
  supplierId?: string | null;
  keterangan?: string;
}): Promise<InvResult> {
  const c = await ctx();
  if ("error" in c) return { ok: false, error: c.error };

  const user = await getSessionUser();
  const isOwner = getRoleFromUser(user) === "owner";

  const qty = num(input.qty);
  const total = num(input.totalHarga);
  const kas = String(input.kasKode ?? "");
  if (!(qty > 0)) return { ok: false, error: "Jumlah harus lebih dari 0." };
  if (!(total >= 0)) return { ok: false, error: "Total harga tidak valid." };
  if (!kas) return { ok: false, error: "Pilih metode pembayaran." };

  const item = await loadItem(c, input.itemId);
  if (!item) return { ok: false, error: "Bahan tidak ditemukan." };

  const payload = {
    itemId: input.itemId,
    qty,
    totalHarga: total,
    kasKode: kas,
    supplierId: input.supplierId ?? null,
    keterangan: input.keterangan ?? null,
    outletId: c.outletId,
  };

  // Staf (bukan pemilik): buat permintaan persetujuan, jangan langsung eksekusi.
  if (!isOwner) {
    const db = getDb();
    const [emp] = await db
      .select({ id: employees.id, nama: employees.nama })
      .from(employees)
      .where(and(eq(employees.authUserId, c.userId), eq(employees.tenantId, c.tenantId)))
      .limit(1);
    await db.insert(approvals).values({
      tenantId: c.tenantId,
      tipe: "beli_inventori",
      judul: `Pembelian stok: ${item.nama} (${qty} ${item.satuan})`,
      nominal: Math.round(total),
      payload,
      status: "pending",
      requestedBy: emp?.id ?? null,
      requestedByNama: emp?.nama ?? user?.email ?? null,
    });
    revalidatePath("/inventori");
    revalidatePath("/dashboard");
    return { ok: true, pending: true };
  }

  // Pemilik: eksekusi langsung.
  const res = await executeBuyStock(c.tenantId, c.outletId, c.userId, {
    itemId: payload.itemId,
    qty: payload.qty,
    totalHarga: payload.totalHarga,
    kasKode: payload.kasKode,
    supplierId: payload.supplierId,
    keterangan: input.keterangan,
  });
  if (!res.ok) return res;
  revalidate();
  return { ok: true };
}

/** Pakai stok → stok berkurang + jurnal Dr Beban / Cr Persediaan. */
export async function useStock(input: {
  itemId: string;
  qty: number | string;
  keterangan?: string;
}): Promise<InvResult> {
  const c = await ctx();
  if ("error" in c) return { ok: false, error: c.error };

  const qty = num(input.qty);
  if (!(qty > 0)) return { ok: false, error: "Jumlah harus lebih dari 0." };

  const item = await loadItem(c, input.itemId);
  if (!item) return { ok: false, error: "Bahan tidak ditemukan." };
  if (qty > Number(item.stok))
    return {
      ok: false,
      error: `Stok tidak cukup (tersisa ${Number(item.stok)} ${item.satuan}).`,
    };

  const unit = Number(item.harga);
  const nilai = qty * unit;
  const saldo = Number(item.stok) - qty;

  await seedDefaultCoaIfEmpty(c.tenantId);
  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(inventoryItems)
        .set({ stok: String(saldo), updatedAt: new Date() })
        .where(eq(inventoryItems.id, item.id));
      await tx.insert(inventoryMovements).values({
        tenantId: c.tenantId,
        outletId: c.outletId,
        itemId: item.id,
        tipe: "pemakaian",
        qtyDelta: String(-qty),
        hargaSatuan: String(unit),
        saldoSesudah: String(saldo),
        keterangan: input.keterangan?.trim() || `Pakai ${item.nama}`,
        createdBy: c.userId,
      });
      if (nilai > 0) {
        await postJournal(tx, c.tenantId, {
          keterangan: `Pemakaian stok: ${item.nama}`,
          refType: "inventori_pakai",
          refId: item.id,
          lines: [
            { kode: "5.1", debit: nilai },
            { kode: "1.3", kredit: nilai },
          ],
        });
      }
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal menyimpan.",
    };
  }
  revalidate();
  return { ok: true };
}

/** Stok opname → set stok fisik; selisih dicatat + jurnal penyesuaian. */
export async function adjustStock(input: {
  itemId: string;
  stokFisik: number | string;
  keterangan?: string;
}): Promise<InvResult> {
  const c = await ctx();
  if ("error" in c) return { ok: false, error: c.error };

  const fisik = num(input.stokFisik);
  if (!(fisik >= 0)) return { ok: false, error: "Stok fisik tidak valid." };

  const item = await loadItem(c, input.itemId);
  if (!item) return { ok: false, error: "Bahan tidak ditemukan." };

  const delta = fisik - Number(item.stok);
  if (delta === 0) return { ok: true };
  const unit = Number(item.harga);
  const nilai = Math.abs(delta) * unit;

  await seedDefaultCoaIfEmpty(c.tenantId);
  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(inventoryItems)
        .set({ stok: String(fisik), updatedAt: new Date() })
        .where(eq(inventoryItems.id, item.id));
      await tx.insert(inventoryMovements).values({
        tenantId: c.tenantId,
        outletId: c.outletId,
        itemId: item.id,
        tipe: "penyesuaian",
        qtyDelta: String(delta),
        hargaSatuan: String(unit),
        saldoSesudah: String(fisik),
        keterangan: input.keterangan?.trim() || "Stok opname",
        createdBy: c.userId,
      });
      if (nilai > 0) {
        // Selisih kurang → beban; selisih lebih → kurangi beban.
        const lines =
          delta < 0
            ? [
                { kode: "5.1", debit: nilai },
                { kode: "1.3", kredit: nilai },
              ]
            : [
                { kode: "1.3", debit: nilai },
                { kode: "5.1", kredit: nilai },
              ];
        await postJournal(tx, c.tenantId, {
          keterangan: `Penyesuaian stok: ${item.nama}`,
          refType: "inventori_opname",
          refId: item.id,
          lines,
        });
      }
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal menyimpan.",
    };
  }
  revalidate();
  return { ok: true };
}

/** Transfer stok dari outlet aktif ke outlet lain (owner). Tanpa jurnal. */
export async function transferStock(input: {
  itemId: string;
  qty: number | string;
  toOutletId: string;
  keterangan?: string;
}): Promise<InvResult> {
  const user = await getSessionUser();
  const c = await ctx();
  if ("error" in c) return { ok: false, error: c.error };
  if (getRoleFromUser(user) !== "owner")
    return { ok: false, error: "Hanya pemilik yang dapat transfer stok." };

  const qty = num(input.qty);
  if (!(qty > 0)) return { ok: false, error: "Jumlah harus lebih dari 0." };
  if (input.toOutletId === c.outletId)
    return { ok: false, error: "Outlet tujuan harus berbeda." };

  const item = await loadItem(c, input.itemId);
  if (!item) return { ok: false, error: "Bahan tidak ditemukan." };
  if (qty > Number(item.stok))
    return {
      ok: false,
      error: `Stok tidak cukup (tersisa ${Number(item.stok)} ${item.satuan}).`,
    };

  const db = getDb();
  const outletRows = await db
    .select({ id: outlets.id, nama: outlets.nama })
    .from(outlets)
    .where(
      and(
        eq(outlets.tenantId, c.tenantId),
        inArray(outlets.id, [c.outletId, input.toOutletId]),
      ),
    );
  const dest = outletRows.find((o) => o.id === input.toOutletId);
  const src = outletRows.find((o) => o.id === c.outletId);
  if (!dest) return { ok: false, error: "Outlet tujuan tidak ditemukan." };

  try {
    await db.transaction(async (tx) => {
      // Sumber: kurangi stok.
      const srcSaldo = Number(item.stok) - qty;
      await tx
        .update(inventoryItems)
        .set({ stok: String(srcSaldo), updatedAt: new Date() })
        .where(eq(inventoryItems.id, item.id));
      await tx.insert(inventoryMovements).values({
        tenantId: c.tenantId,
        outletId: c.outletId,
        itemId: item.id,
        tipe: "penyesuaian",
        qtyDelta: String(-qty),
        hargaSatuan: item.harga,
        saldoSesudah: String(srcSaldo),
        keterangan: input.keterangan?.trim() || `Transfer ke ${dest.nama}`,
        createdBy: c.userId,
      });

      // Tujuan: cari bahan serupa (nama+satuan), buat bila belum ada.
      const [existing] = await tx
        .select()
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.tenantId, c.tenantId),
            eq(inventoryItems.outletId, input.toOutletId),
            eq(inventoryItems.nama, item.nama),
            eq(inventoryItems.satuan, item.satuan),
          ),
        )
        .limit(1);

      let destItemId: string;
      let destSaldo: number;
      if (existing) {
        destItemId = existing.id;
        destSaldo = Number(existing.stok) + qty;
        await tx
          .update(inventoryItems)
          .set({ stok: String(destSaldo), updatedAt: new Date() })
          .where(eq(inventoryItems.id, existing.id));
      } else {
        destSaldo = qty;
        const [created] = await tx
          .insert(inventoryItems)
          .values({
            tenantId: c.tenantId,
            outletId: input.toOutletId,
            nama: item.nama,
            satuan: item.satuan,
            harga: item.harga,
            minStok: item.minStok,
            stok: String(qty),
          })
          .returning({ id: inventoryItems.id });
        destItemId = created.id;
      }
      await tx.insert(inventoryMovements).values({
        tenantId: c.tenantId,
        outletId: input.toOutletId,
        itemId: destItemId,
        tipe: "penyesuaian",
        qtyDelta: String(qty),
        hargaSatuan: item.harga,
        saldoSesudah: String(destSaldo),
        keterangan: `Transfer dari ${src?.nama ?? "outlet lain"}`,
        createdBy: c.userId,
      });
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal transfer.",
    };
  }
  revalidatePath("/inventori");
  return { ok: true };
}
