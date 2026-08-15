"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, deliveries } from "@akalink/db";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getActiveOutlet } from "@/lib/outlets";
import { seedDefaultCoaIfEmpty, ensureCoaAccount, AKUN_PENDAPATAN_ANTAR } from "@/lib/coa";
import { postJournal, hasJournal } from "@/lib/journal";

export type DeliveryResult = { ok: true } | { ok: false; error: string };

const STATUSES = [
  "menunggu",
  "dijadwalkan",
  "dalam_perjalanan",
  "selesai",
  "batal",
] as const;

async function ctx() {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return null;
  return { user, tenantId };
}

export async function createDelivery(input: {
  tipe: "jemput" | "antar";
  alamat: string;
  consumerId?: string | null;
  kontakNama?: string;
  kontakHp?: string;
  jadwal?: string | null;
  biayaAntar?: number | string;
  catatan?: string;
  transactionId?: string | null;
}): Promise<DeliveryResult> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sesi tidak valid." };

  const alamat = String(input.alamat ?? "").trim();
  if (alamat.length < 3) return { ok: false, error: "Alamat wajib diisi." };

  const db = getDb();
  const outlet = await getActiveOutlet(c.tenantId);
  await db.insert(deliveries).values({
    tenantId: c.tenantId,
    outletId: outlet?.id ?? null,
    consumerId: input.consumerId || null,
    transactionId: input.transactionId || null,
    tipe: input.tipe === "antar" ? "antar" : "jemput",
    kontakNama: input.kontakNama?.trim() || null,
    kontakHp: input.kontakHp?.trim() || null,
    alamat,
    jadwal: input.jadwal ? new Date(input.jadwal) : null,
    biayaAntar: Math.max(0, Math.floor(Number(input.biayaAntar) || 0)),
    catatan: input.catatan?.trim() || null,
    status: "menunggu",
  });
  revalidatePath("/antar-jemput");
  return { ok: true };
}

export async function assignKurir(input: {
  id: string;
  kurirId: string | null;
}): Promise<DeliveryResult> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sesi tidak valid." };
  const db = getDb();
  await db
    .update(deliveries)
    .set({
      kurirId: input.kurirId || null,
      // Tetapkan jadwal → status dijadwalkan bila masih menunggu.
      status: input.kurirId ? "dijadwalkan" : "menunggu",
      updatedAt: new Date(),
    })
    .where(and(eq(deliveries.id, input.id), eq(deliveries.tenantId, c.tenantId)));
  revalidatePath("/antar-jemput");
  return { ok: true };
}

export async function updateDeliveryStatus(input: {
  id: string;
  status: string;
}): Promise<DeliveryResult> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sesi tidak valid." };
  if (!STATUSES.includes(input.status as (typeof STATUSES)[number]))
    return { ok: false, error: "Status tidak valid." };

  const db = getDb();
  const [d] = await db
    .select()
    .from(deliveries)
    .where(and(eq(deliveries.id, input.id), eq(deliveries.tenantId, c.tenantId)))
    .limit(1);
  if (!d) return { ok: false, error: "Data tidak ditemukan." };

  await db
    .update(deliveries)
    .set({ status: input.status as (typeof STATUSES)[number], updatedAt: new Date() })
    .where(and(eq(deliveries.id, input.id), eq(deliveries.tenantId, c.tenantId)));

  // Saat selesai: catat pendapatan ongkir (tunai) — sekali saja.
  if (
    input.status === "selesai" &&
    d.biayaAntar > 0 &&
    !(await hasJournal(c.tenantId, "antar_jemput", d.id))
  ) {
    await seedDefaultCoaIfEmpty(c.tenantId);
    await ensureCoaAccount(c.tenantId, AKUN_PENDAPATAN_ANTAR);
    await db.transaction(async (tx) => {
      await postJournal(tx, c.tenantId, {
        keterangan: `Ongkir antar-jemput`,
        refType: "antar_jemput",
        refId: d.id,
        lines: [
          { kode: "1.1.02", debit: d.biayaAntar }, // Dr Kas Outlet
          { kode: AKUN_PENDAPATAN_ANTAR, kredit: d.biayaAntar }, // Cr Pendapatan Antar-Jemput
        ],
      });
    });
  }

  revalidatePath("/antar-jemput");
  return { ok: true };
}

export async function deleteDelivery(id: string): Promise<DeliveryResult> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sesi tidak valid." };
  if (getRoleFromUser(c.user) !== "owner")
    return { ok: false, error: "Hanya pemilik yang dapat menghapus." };
  const db = getDb();
  await db
    .delete(deliveries)
    .where(and(eq(deliveries.id, id), eq(deliveries.tenantId, c.tenantId)));
  revalidatePath("/antar-jemput");
  return { ok: true };
}
