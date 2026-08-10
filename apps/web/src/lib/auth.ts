import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Ambil pengguna yang sedang login (tervalidasi ke server Supabase).
 * Dibungkus `cache` agar hanya sekali per request meski dipanggil berkali-kali.
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export function getTenantIdFromUser(user: User | null): string | undefined {
  const tenantId = user?.app_metadata?.tenant_id;
  return typeof tenantId === "string" ? tenantId : undefined;
}

export function getRoleFromUser(user: User | null): string | undefined {
  const role = user?.app_metadata?.role;
  return typeof role === "string" ? role : undefined;
}
