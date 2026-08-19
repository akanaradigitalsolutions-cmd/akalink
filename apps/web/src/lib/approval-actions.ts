"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, approvals, employees } from "@akalink/db";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { executeBuyStock, type BuyStockPayload } from "@/lib/inventory-core";

export type ApprovalResult = { ok: true } | { ok: false; error: string };

async function ownerCtx() {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return null;
  if (getRoleFromUser(user) !== "owner") return null;
  return { user, tenantId };
}

/** Pemilik menyetujui → aksi dieksekusi sesuai tipe. */
export async function approveApproval(id: string): Promise<ApprovalResult> {
  const c = await ownerCtx();
  if (!c) return { ok: false, error: "Hanya pemilik yang dapat menyetujui." };

  const db = getDb();
  const [req] = await db
    .select()
    .from(approvals)
    .where(and(eq(approvals.id, id), eq(approvals.tenantId, c.tenantId)))
    .limit(1);
  if (!req) return { ok: false, error: "Permintaan tidak ditemukan." };
  if (req.status !== "pending")
    return { ok: false, error: "Permintaan sudah diputuskan." };

  // Eksekusi aksi sesuai tipe.
  if (req.tipe === "beli_inventori") {
    const p = (req.payload ?? {}) as Partial<BuyStockPayload> & { outletId?: string | null };
    const res = await executeBuyStock(
      c.tenantId,
      p.outletId ?? null,
      c.user.id,
      {
        itemId: String(p.itemId),
        qty: Number(p.qty),
        totalHarga: Number(p.totalHarga),
        kasKode: String(p.kasKode),
        supplierId: p.supplierId ?? null,
        keterangan: p.keterangan ?? undefined,
      },
    );
    if (!res.ok) return res;
  } else {
    return { ok: false, error: "Tipe permintaan tidak dikenal." };
  }

  const [emp] = await db
    .select({ id: employees.id, nama: employees.nama })
    .from(employees)
    .where(and(eq(employees.authUserId, c.user.id), eq(employees.tenantId, c.tenantId)))
    .limit(1);

  await db
    .update(approvals)
    .set({
      status: "approved",
      decidedBy: emp?.id ?? null,
      decidedByNama: emp?.nama ?? c.user.email ?? null,
      decidedAt: new Date(),
    })
    .where(eq(approvals.id, id));

  revalidatePath("/dashboard");
  revalidatePath("/inventori");
  return { ok: true };
}

export async function rejectApproval(input: {
  id: string;
  catatan?: string;
}): Promise<ApprovalResult> {
  const c = await ownerCtx();
  if (!c) return { ok: false, error: "Hanya pemilik yang dapat menolak." };
  const db = getDb();
  const [emp] = await db
    .select({ id: employees.id, nama: employees.nama })
    .from(employees)
    .where(and(eq(employees.authUserId, c.user.id), eq(employees.tenantId, c.tenantId)))
    .limit(1);
  const res = await db
    .update(approvals)
    .set({
      status: "rejected",
      catatan: input.catatan?.trim() || null,
      decidedBy: emp?.id ?? null,
      decidedByNama: emp?.nama ?? c.user.email ?? null,
      decidedAt: new Date(),
    })
    .where(
      and(
        eq(approvals.id, input.id),
        eq(approvals.tenantId, c.tenantId),
        eq(approvals.status, "pending"),
      ),
    )
    .returning({ id: approvals.id });
  if (res.length === 0)
    return { ok: false, error: "Permintaan tidak ditemukan / sudah diputuskan." };
  revalidatePath("/dashboard");
  return { ok: true };
}
