"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, tenants, appCoinLedger } from "@akalink/db";
import { getSessionUser } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/platform";

export type AdminResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const user = await getSessionUser();
  if (!(await isPlatformAdmin(user))) return null;
  return user;
}

const TENANT_STATUS = ["trial", "active", "suspended"] as const;
const TENANT_TIER = ["basic", "premium", "power"] as const;

/** Sesuaikan saldo koin tenant (bonus/koreksi) — admin platform. */
export async function adjustTenantCoin(input: {
  tenantId: string;
  amount: number | string; // bertanda: + menambah, − mengurangi
  tipe?: "bonus" | "penyesuaian";
  keterangan?: string;
}): Promise<AdminResult> {
  if (!(await requireAdmin()))
    return { ok: false, error: "Akses ditolak (bukan admin platform)." };

  const amount = Math.trunc(Number(input.amount) || 0);
  if (amount === 0) return { ok: false, error: "Nominal tidak boleh 0." };
  const tipe = input.tipe === "penyesuaian" ? "penyesuaian" : "bonus";

  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      const [t] = await tx
        .select({ saldo: tenants.saldoKoin })
        .from(tenants)
        .where(eq(tenants.id, input.tenantId))
        .for("update")
        .limit(1);
      if (!t) throw new Error("Tenant tidak ditemukan.");
      const saldoSesudah = (t.saldo ?? 0) + amount;
      await tx
        .update(tenants)
        .set({ saldoKoin: saldoSesudah, updatedAt: new Date() })
        .where(eq(tenants.id, input.tenantId));
      await tx.insert(appCoinLedger).values({
        tenantId: input.tenantId,
        tipe,
        delta: amount,
        saldoSesudah,
        keterangan: input.keterangan?.trim() || `Penyesuaian admin (${tipe})`,
        refType: "admin",
      });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal." };
  }
  revalidatePath(`/admin/tenant/${input.tenantId}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function setTenantStatus(input: {
  tenantId: string;
  status: string;
}): Promise<AdminResult> {
  if (!(await requireAdmin()))
    return { ok: false, error: "Akses ditolak." };
  if (!TENANT_STATUS.includes(input.status as (typeof TENANT_STATUS)[number]))
    return { ok: false, error: "Status tidak valid." };
  const db = getDb();
  await db
    .update(tenants)
    .set({ status: input.status as (typeof TENANT_STATUS)[number], updatedAt: new Date() })
    .where(eq(tenants.id, input.tenantId));
  revalidatePath(`/admin/tenant/${input.tenantId}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function setTenantTier(input: {
  tenantId: string;
  tier: string;
}): Promise<AdminResult> {
  if (!(await requireAdmin()))
    return { ok: false, error: "Akses ditolak." };
  if (!TENANT_TIER.includes(input.tier as (typeof TENANT_TIER)[number]))
    return { ok: false, error: "Tier tidak valid." };
  const db = getDb();
  await db
    .update(tenants)
    .set({ tier: input.tier as (typeof TENANT_TIER)[number], updatedAt: new Date() })
    .where(eq(tenants.id, input.tenantId));
  revalidatePath(`/admin/tenant/${input.tenantId}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function setTenantBiaya(input: {
  tenantId: string;
  biayaPerNota: number | string;
  biayaPerWa: number | string;
}): Promise<AdminResult> {
  if (!(await requireAdmin()))
    return { ok: false, error: "Akses ditolak." };
  const db = getDb();
  await db
    .update(tenants)
    .set({
      biayaPerNota: Math.max(0, Math.floor(Number(input.biayaPerNota) || 0)),
      biayaPerWa: Math.max(0, Math.floor(Number(input.biayaPerWa) || 0)),
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, input.tenantId));
  revalidatePath(`/admin/tenant/${input.tenantId}`);
  return { ok: true };
}
