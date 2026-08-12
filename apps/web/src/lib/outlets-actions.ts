"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, outlets } from "@akalink/db";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { OUTLET_COOKIE, getAllowedOutlets } from "@/lib/outlets";

export type OutletResult = { ok: true } | { ok: false; error: string };

async function requireOwner() {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId)
    return { ok: false as const, error: "Sesi tidak valid." };
  if (getRoleFromUser(user) !== "owner")
    return {
      ok: false as const,
      error: "Hanya pemilik (Owner) yang dapat mengelola outlet.",
    };
  return { ok: true as const, tenantId };
}

const schema = z.object({
  nama: z.string().trim().min(2, "Nama outlet minimal 2 karakter"),
  telepon: z.string().trim().optional(),
  kota: z.string().trim().optional(),
  alamat: z.string().trim().optional(),
});

const clean = (v?: string) => {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
};

export async function createOutlet(input: {
  nama: string;
  telepon?: string;
  kota?: string;
  alamat?: string;
}): Promise<OutletResult> {
  const auth = await requireOwner();
  if (!auth.ok) return auth;

  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };

  const db = getDb();
  await db.insert(outlets).values({
    tenantId: auth.tenantId,
    nama: parsed.data.nama,
    telepon: clean(parsed.data.telepon),
    kota: clean(parsed.data.kota),
    alamat: clean(parsed.data.alamat),
  });

  revalidatePath("/outlet");
  return { ok: true };
}

export async function updateOutlet(input: {
  id: string;
  nama: string;
  telepon?: string;
  kota?: string;
  alamat?: string;
}): Promise<OutletResult> {
  const auth = await requireOwner();
  if (!auth.ok) return auth;

  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };

  const db = getDb();
  await db
    .update(outlets)
    .set({
      nama: parsed.data.nama,
      telepon: clean(parsed.data.telepon),
      kota: clean(parsed.data.kota),
      alamat: clean(parsed.data.alamat),
      updatedAt: new Date(),
    })
    .where(and(eq(outlets.id, input.id), eq(outlets.tenantId, auth.tenantId)));

  revalidatePath("/outlet");
  return { ok: true };
}

export async function deleteOutlet(input: {
  id: string;
}): Promise<OutletResult> {
  const auth = await requireOwner();
  if (!auth.ok) return auth;

  const db = getDb();
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(outlets)
    .where(eq(outlets.tenantId, auth.tenantId));
  if (n <= 1)
    return {
      ok: false,
      error: "Tidak bisa menghapus outlet terakhir. Minimal satu outlet.",
    };

  await db
    .delete(outlets)
    .where(and(eq(outlets.id, input.id), eq(outlets.tenantId, auth.tenantId)));
  // Transaksi/layanan yang menunjuk outlet ini otomatis di-set null (FK).

  revalidatePath("/outlet");
  return { ok: true };
}

/** Ganti outlet aktif (disimpan di cookie). Semua peran boleh. */
export async function setActiveOutlet(input: {
  id: string;
}): Promise<OutletResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return { ok: false, error: "Sesi tidak valid." };

  // Hanya boleh memilih outlet yang diizinkan untuk pengguna ini.
  const allowed = await getAllowedOutlets(tenantId);
  if (!allowed.some((o) => o.id === input.id))
    return { ok: false, error: "Outlet tidak tersedia untuk Anda." };

  const jar = await cookies();
  jar.set(OUTLET_COOKIE, input.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
