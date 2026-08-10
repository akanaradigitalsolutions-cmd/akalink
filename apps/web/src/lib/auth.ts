import "server-only";

import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Ambil pengguna yang sedang login (tervalidasi ke server Supabase).
 * Mengembalikan null bila belum login.
 */
export async function getSessionUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Ambil tenant_id dari klaim app_metadata pada token pengguna.
 * Nilai inilah yang dipakai oleh policy RLS di database.
 */
export function getTenantIdFromUser(user: User | null): string | undefined {
  const tenantId = user?.app_metadata?.tenant_id;
  return typeof tenantId === "string" ? tenantId : undefined;
}

export function getRoleFromUser(user: User | null): string | undefined {
  const role = user?.app_metadata?.role;
  return typeof role === "string" ? role : undefined;
}
