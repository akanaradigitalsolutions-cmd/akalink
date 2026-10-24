"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
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
  | { ok: true; tenantId: string; ownAuthId: string; ownerEmail: string | null };

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
  return {
    ok: true,
    tenantId,
    ownAuthId: user.id,
    ownerEmail: user.email ?? null,
  };
}

const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

/** Email sintetis dari email pemilik + username (reset nyasar ke inbox pemilik). */
function plusAddress(ownerEmail: string, username: string): string {
  const at = ownerEmail.indexOf("@");
  const local = ownerEmail.slice(0, at).split("+")[0];
  const domain = ownerEmail.slice(at + 1);
  return `${local}+${username}@${domain}`;
}

/**
 * Resolusi identifier login (email ATAU username) menjadi email akun Supabase.
 * Dipakai oleh halaman Masuk & Lupa Password.
 */
export async function resolveLoginEmail(
  identifier: string,
): Promise<string | null> {
  const id = (identifier ?? "").trim();
  if (!id) return null;
  if (id.includes("@")) return id; // sudah berupa email
  const username = id.toLowerCase();
  const db = getDb();
  const rows = await db
    .select({ authUserId: employees.authUserId })
    .from(employees)
    .where(eq(employees.employeeCode, username))
    .limit(2);
  if (rows.length !== 1 || !rows[0].authUserId) return null;
  const admin = createSupabaseAdminClient();
  const { data } = await admin.auth.admin.getUserById(rows[0].authUserId);
  return data?.user?.email ?? null;
}

export async function createEmployee(input: {
  nama: string;
  email?: string;
  username?: string;
  password: string;
  role: string;
  outletIds?: string[];
}): Promise<EmployeeResult> {
  const auth = await requireOwner();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { tenantId, ownerEmail } = auth;

  const nama = (input.nama ?? "").trim();
  const password = String(input.password ?? "");
  const role = input.role === "owner" ? "owner" : "kasir";
  const emailInput = (input.email ?? "").trim();
  const username = (input.username ?? "").trim().toLowerCase();

  if (nama.length < 2) return { ok: false, error: "Nama minimal 2 karakter." };
  if (password.length < 8)
    return { ok: false, error: "Password minimal 8 karakter." };
  if (!emailInput && !username)
    return { ok: false, error: "Isi Email atau Username untuk login." };

  // Validasi email bila diisi.
  if (emailInput && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput))
    return { ok: false, error: "Format email tidak valid." };

  // Validasi & keunikan username bila diisi.
  const db = getDb();
  if (username) {
    if (!USERNAME_RE.test(username))
      return {
        ok: false,
        error: "Username 3–30 karakter: huruf kecil, angka, titik, strip.",
      };
    const [dup] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.employeeCode, username))
      .limit(1);
    if (dup) return { ok: false, error: "Username sudah dipakai, pilih lain." };
  }

  // Email akun Supabase: pakai email asli bila ada; jika hanya username,
  // buat alias dari email pemilik agar reset password masuk ke inbox pemilik.
  let authEmail: string;
  if (emailInput) {
    authEmail = emailInput;
  } else {
    if (!ownerEmail)
      return {
        ok: false,
        error: "Email pemilik tidak diketahui — pakai Email untuk login.",
      };
    authEmail = plusAddress(ownerEmail, username);
  }

  const outletIds =
    role === "owner" ? [] : (input.outletIds ?? []).filter(Boolean);

  const admin = createSupabaseAdminClient();

  // 1) Buat akun login (langsung terkonfirmasi untuk MVP).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    if (createErr?.message?.toLowerCase().includes("already"))
      return {
        ok: false,
        error: emailInput
          ? "Email ini sudah terdaftar."
          : "Username ini sudah dipakai.",
      };
    return { ok: false, error: "Gagal membuat akun login." };
  }
  const userId = created.user.id;

  // 2) Simpan tenant_id + role ke app_metadata (JWT untuk RLS & gating).
  const { error: metaErr } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { tenant_id: tenantId, role },
  });
  if (metaErr) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return { ok: false, error: "Gagal menyiapkan akses akun." };
  }

  // 3) Simpan baris karyawan (username disimpan di kolom employee_code).
  try {
    await db.insert(employees).values({
      tenantId,
      authUserId: userId,
      nama,
      email: authEmail,
      employeeCode: username || null,
      role,
      outletIds,
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

export async function setEmployeeOutlets(input: {
  id: string;
  outletIds: string[];
}): Promise<EmployeeResult> {
  const auth = await requireOwner();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { tenantId } = auth;

  const db = getDb();
  const [emp] = await db
    .select({ role: employees.role })
    .from(employees)
    .where(and(eq(employees.id, input.id), eq(employees.tenantId, tenantId)))
    .limit(1);
  if (!emp) return { ok: false, error: "Karyawan tidak ditemukan." };
  if (emp.role === "owner")
    return { ok: false, error: "Pemilik selalu mengakses semua outlet." };

  await db
    .update(employees)
    .set({
      outletIds: (input.outletIds ?? []).filter(Boolean),
      updatedAt: new Date(),
    })
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
