"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, promos } from "@akalink/db";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { findPromoByKode, hitungPotongan } from "@/lib/promos";

export type PromoResult = { ok: true } | { ok: false; error: string };

async function requireOwner() {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId)
    return { ok: false as const, error: "Sesi tidak valid." };
  if (getRoleFromUser(user) !== "owner")
    return {
      ok: false as const,
      error: "Hanya pemilik (Owner) yang dapat mengelola promo.",
    };
  return { ok: true as const, tenantId };
}

const cleanKode = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
const numNonNeg = (v: unknown) => Math.max(0, Number(String(v).replace(",", ".")) || 0);

export async function createPromo(input: {
  kode: string;
  nama: string;
  tipe: string;
  nilai: number | string;
  minBelanja?: number | string;
  maxPotongan?: number | string;
  berlakuSampai?: string;
}): Promise<PromoResult> {
  const a = await requireOwner();
  if (!a.ok) return a;
  const kode = cleanKode(input.kode);
  if (kode.length < 2) return { ok: false, error: "Kode promo wajib diisi." };
  const nama = String(input.nama ?? "").trim() || kode;
  const tipe = input.tipe === "nominal" ? "nominal" : "persen";
  const nilai = numNonNeg(input.nilai);
  if (!(nilai > 0)) return { ok: false, error: "Nilai promo harus lebih dari 0." };

  const db = getDb();
  try {
    await db.insert(promos).values({
      tenantId: a.tenantId,
      kode,
      nama,
      tipe,
      nilai: String(nilai),
      minBelanja: String(numNonNeg(input.minBelanja)),
      maxPotongan: String(numNonNeg(input.maxPotongan)),
      berlakuSampai: input.berlakuSampai?.trim() || null,
    });
  } catch {
    return { ok: false, error: "Kode promo sudah dipakai." };
  }
  revalidatePath("/promo");
  return { ok: true };
}

export async function updatePromo(input: {
  id: string;
  nama: string;
  aktif: boolean;
}): Promise<PromoResult> {
  const a = await requireOwner();
  if (!a.ok) return a;
  const db = getDb();
  await db
    .update(promos)
    .set({ nama: String(input.nama ?? "").trim(), aktif: !!input.aktif })
    .where(and(eq(promos.id, input.id), eq(promos.tenantId, a.tenantId)));
  revalidatePath("/promo");
  return { ok: true };
}

export async function deletePromo(input: { id: string }): Promise<PromoResult> {
  const a = await requireOwner();
  if (!a.ok) return a;
  const db = getDb();
  await db
    .delete(promos)
    .where(and(eq(promos.id, input.id), eq(promos.tenantId, a.tenantId)));
  revalidatePath("/promo");
  return { ok: true };
}

export type ValidatePromoResult =
  | { ok: true; potongan: number; nama: string; kode: string }
  | { ok: false; error: string };

/** Validasi kode promo untuk subtotal & kembalikan potongannya (untuk POS). */
export async function validatePromo(input: {
  kode: string;
  subtotal: number | string;
}): Promise<ValidatePromoResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return { ok: false, error: "Sesi tidak valid." };

  const subtotal = Math.max(0, Number(input.subtotal) || 0);
  const kode = cleanKode(input.kode);
  if (!kode) return { ok: false, error: "Masukkan kode promo." };

  const promo = await findPromoByKode(tenantId, kode);
  if (!promo || !promo.aktif)
    return { ok: false, error: "Kode promo tidak ditemukan / nonaktif." };
  if (promo.berlakuSampai) {
    // berlakuSampai (YYYY-MM-DD) berlaku sampai akhir hari itu.
    const end = new Date(`${promo.berlakuSampai}T23:59:59+08:00`);
    if (Date.now() > end.getTime())
      return { ok: false, error: "Kode promo sudah kedaluwarsa." };
  }
  if (subtotal < Number(promo.minBelanja))
    return {
      ok: false,
      error: `Minimal belanja Rp ${Number(promo.minBelanja).toLocaleString("id-ID")}.`,
    };

  const potongan = hitungPotongan(promo, subtotal);
  if (potongan <= 0)
    return { ok: false, error: "Promo tidak memberi potongan." };
  return { ok: true, potongan, nama: promo.nama, kode: promo.kode };
}
