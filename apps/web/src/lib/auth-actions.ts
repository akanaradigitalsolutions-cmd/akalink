"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, tenants, employees, accessLevels } from "@akalink/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ActionState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

function fieldErrorsFrom(err: z.ZodError): Record<string, string> {
  const fe: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fe[key]) fe[key] = issue.message;
  }
  return fe;
}

// ---- Registrasi tenant + owner ------------------------------------------
const daftarSchema = z.object({
  namaLaundry: z.string().min(2, "Nama laundry minimal 2 karakter"),
  namaOwner: z.string().min(2, "Nama Anda minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  kota: z.string().trim().optional(),
});

export async function daftarTenant(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = daftarSchema.safeParse({
    namaLaundry: formData.get("namaLaundry"),
    namaOwner: formData.get("namaOwner"),
    email: formData.get("email"),
    password: formData.get("password"),
    kota: (formData.get("kota") as string) || undefined,
  });

  if (!parsed.success) {
    return {
      error: "Mohon periksa kembali isian formulir.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { namaLaundry, namaOwner, email, password, kota } = parsed.data;
  const admin = createSupabaseAdminClient();

  // 1) Buat akun login (email langsung dikonfirmasi untuk MVP).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    console.error("[daftar] createUser gagal:", createErr);
    if (createErr?.message?.toLowerCase().includes("already")) {
      return { error: "Email ini sudah terdaftar. Silakan masuk." };
    }
    return { error: "Gagal membuat akun. Silakan coba lagi." };
  }
  const userId = created.user.id;

  // 2) Buat data tenant + level akses owner + employee owner (atomik).
  try {
    const db = getDb();
    const tenantId = await db.transaction(async (tx) => {
      const [tenant] = await tx
        .insert(tenants)
        .values({ nama: namaLaundry, kota, tier: "basic", status: "trial" })
        .returning();

      await tx.insert(accessLevels).values({
        tenantId: tenant.id,
        nama: "Owner",
        deskripsi: "Akses penuh pemilik bisnis",
      });

      await tx.insert(employees).values({
        tenantId: tenant.id,
        authUserId: userId,
        nama: namaOwner,
        role: "owner",
        status: "active",
      });

      return tenant.id;
    });

    // 3) Simpan tenant_id + role ke app_metadata → masuk ke JWT (dipakai RLS).
    const { error: metaErr } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { tenant_id: tenantId, role: "owner" },
    });
    if (metaErr) throw metaErr;
  } catch (e) {
    console.error("[daftar] setup tenant gagal:", e);
    // Bila penyiapan data gagal, batalkan akun agar tidak ada user yatim.
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return { error: "Gagal menyiapkan data laundry. Silakan coba lagi." };
  }

  // 4) Loginkan pengguna (set cookie sesi) lalu arahkan ke dashboard.
  const supabase = await createSupabaseServerClient();
  const { error: signErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signErr) {
    redirect("/masuk?terdaftar=1");
  }
  redirect("/dashboard");
}

// ---- Login ---------------------------------------------------------------
const masukSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export async function masuk(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = masukSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      error: "Mohon periksa kembali isian formulir.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Email atau password salah." };
  }
  redirect("/dashboard");
}

// ---- Logout --------------------------------------------------------------
export async function keluar() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/masuk");
}
