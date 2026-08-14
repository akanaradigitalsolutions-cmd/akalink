"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, memberTypes, consumers } from "@akalink/db";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";

export type MemberResult = { ok: true } | { ok: false; error: string };

async function requireOwner() {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId)
    return { ok: false as const, error: "Sesi tidak valid." };
  if (getRoleFromUser(user) !== "owner")
    return {
      ok: false as const,
      error: "Hanya pemilik (Owner) yang dapat mengelola jenis member.",
    };
  return { ok: true as const, tenantId };
}

async function requireTenant() {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId)
    return { ok: false as const, error: "Sesi tidak valid." };
  return { ok: true as const, tenantId };
}

function pct(v: unknown): number {
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export async function createMemberType(input: {
  nama: string;
  diskonPersen: number | string;
}): Promise<MemberResult> {
  const a = await requireOwner();
  if (!a.ok) return a;
  const nama = String(input.nama ?? "").trim();
  if (nama.length < 2) return { ok: false, error: "Nama jenis wajib diisi." };

  const db = getDb();
  await db.insert(memberTypes).values({
    tenantId: a.tenantId,
    nama,
    diskonPersen: String(pct(input.diskonPersen)),
  });
  revalidatePath("/member");
  return { ok: true };
}

export async function updateMemberType(input: {
  id: string;
  nama: string;
  diskonPersen: number | string;
  aktif?: boolean;
}): Promise<MemberResult> {
  const a = await requireOwner();
  if (!a.ok) return a;
  const nama = String(input.nama ?? "").trim();
  if (nama.length < 2) return { ok: false, error: "Nama jenis wajib diisi." };

  const db = getDb();
  await db
    .update(memberTypes)
    .set({
      nama,
      diskonPersen: String(pct(input.diskonPersen)),
      aktif: input.aktif ?? true,
    })
    .where(
      and(eq(memberTypes.id, input.id), eq(memberTypes.tenantId, a.tenantId)),
    );
  revalidatePath("/member");
  return { ok: true };
}

export async function deleteMemberType(input: {
  id: string;
}): Promise<MemberResult> {
  const a = await requireOwner();
  if (!a.ok) return a;
  const db = getDb();
  await db
    .delete(memberTypes)
    .where(
      and(eq(memberTypes.id, input.id), eq(memberTypes.tenantId, a.tenantId)),
    );
  revalidatePath("/member");
  return { ok: true };
}

/** Tetapkan / batalkan keanggotaan seorang konsumen (kasir & owner). */
export async function setConsumerMember(input: {
  consumerId: string;
  memberTypeId: string | null;
}): Promise<MemberResult> {
  const a = await requireTenant();
  if (!a.ok) return a;

  const db = getDb();
  // Validasi jenis member milik tenant (bila di-set).
  if (input.memberTypeId) {
    const [mt] = await db
      .select({ id: memberTypes.id })
      .from(memberTypes)
      .where(
        and(
          eq(memberTypes.id, input.memberTypeId),
          eq(memberTypes.tenantId, a.tenantId),
        ),
      )
      .limit(1);
    if (!mt) return { ok: false, error: "Jenis member tidak ditemukan." };
  }

  await db
    .update(consumers)
    .set({ memberTypeId: input.memberTypeId, updatedAt: new Date() })
    .where(
      and(
        eq(consumers.id, input.consumerId),
        eq(consumers.tenantId, a.tenantId),
      ),
    );
  revalidatePath(`/konsumen/${input.consumerId}`);
  revalidatePath("/konsumen");
  return { ok: true };
}
