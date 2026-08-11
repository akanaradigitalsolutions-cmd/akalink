"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, employees } from "@akalink/db";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type EmployeeResult = { ok: true } | { ok: false; error: string };

type OwnerAuth =
  | { ok: false; error: string }
  | { ok: true; tenantId: string; ownAuthId: string };

/** Pastikan pemanggil adalah owner tenant ini. */
async function requireOwner(): Promise<OwnerAuth> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return { ok: false, error: "Sesi tidak valid." };
  if (getRoleFromUser(user) !== "owner")
    return {
      ok: false,
      error: "Hanya pemilik (Owner) yang dapat mengelola karyawan.",
    };
  return { ok: true, tenantId, ownAuthId: user.id };
}

const createSchema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter"),
  email: z.string().trim().email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  role: z.enum(["kasir", "owner"]),
});

export async function createEmployee(input: {
  nama: string;
  email: string;
  password: string;
  role: string;
}): Promise<EmployeeResult> {
  const auth = await requireOwner();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { tenantId } = auth;

  const parsed = createSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  const { nama, email, password, role } = parsed.data;

  const admin = createSupabaseAdminClient();

  // 1) Buat akun login (langsung terkonfirmasi untuk MVP).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    if (createErr?.message?.toLowerCase().includes("already"))
      return { ok: false, error: "Email ini sudah terdaftar." };
    return { ok: false, error: "Gagal membuat akun login." };
  }
  const userId = created.user.id;

  // 2) Simpan tenant_id + role ke app_metadata (masuk ke JWT untuk RLS & gating).
  const { error: metaErr } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { tenant_id: tenantId, role },
  });
  if (metaErr) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return { ok: false, error: "Gagal menyiapkan akses akun." };
  }

  // 3) Simpan baris karyawan.
  try {
    const db = getDb();
    await db.insert(employees).values({
      tenantId,
      authUserId: userId,
      nama,
      email,
      role,
      status: "active",
    });
  } catch {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return { ok: false, error: "Gagal menyimpan data karyawan." };
  }

  revalidatePath("/karyawan");
  return { ok: true };
}

export async function setEmployeeStatus(input: {
  id: string;
  status: "active" | "inactive";
}): Promise<EmployeeResult> {
  const auth = await requireOwner();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { tenantId, ownAuthId } = auth;

  const db = getDb();
  const [emp] = await db
    .select({ role: employees.role, authUserId: employees.authUserId })
    .from(employees)
    .where(and(eq(employees.id, input.id), eq(employees.tenantId, tenantId)))
    .limit(1);
  if (!emp) return { ok: false, error: "Karyawan tidak ditemukan." };
  if (emp.role === "owner")
    return { ok: false, error: "Akun pemilik tidak bisa dinonaktifkan." };
  if (emp.authUserId === ownAuthId)
    return { ok: false, error: "Anda tidak bisa menonaktifkan akun sendiri." };

  await db
    .update(employees)
    .set({ status: input.status, updatedAt: new Date() })
    .where(and(eq(employees.id, input.id), eq(employees.tenantId, tenantId)));

  revalidatePath("/karyawan");
  return { ok: true };
}

export async function deleteEmployee(input: {
  id: string;
}): Promise<EmployeeResult> {
  const auth = await requireOwner();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { tenantId, ownAuthId } = auth;

  const db = getDb();
  const [emp] = await db
    .select({ role: employees.role, authUserId: employees.authUserId })
    .from(employees)
    .where(and(eq(employees.id, input.id), eq(employees.tenantId, tenantId)))
    .limit(1);
  if (!emp) return { ok: false, error: "Karyawan tidak ditemukan." };
  if (emp.role === "owner")
    return { ok: false, error: "Akun pemilik tidak bisa dihapus." };
  if (emp.authUserId === ownAuthId)
    return { ok: false, error: "Anda tidak bisa menghapus akun sendiri." };

  await db
    .delete(employees)
    .where(and(eq(employees.id, input.id), eq(employees.tenantId, tenantId)));

  // Hapus juga akun login-nya.
  if (emp.authUserId) {
    const admin = createSupabaseAdminClient();
    await admin.auth.admin.deleteUser(emp.authUserId).catch(() => {});
  }

  revalidatePath("/karyawan");
  return { ok: true };
}
