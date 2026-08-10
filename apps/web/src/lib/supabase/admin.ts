import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getPublicEnv, getServiceRoleKey } from "@/lib/env";

/**
 * Klien Supabase dengan hak "service role".
 * MELEWATI Row-Level Security — hanya untuk operasi tepercaya di server
 * (registrasi tenant, tugas platform-admin). JANGAN pernah dipakai di klien.
 */
export function createSupabaseAdminClient() {
  const { url } = getPublicEnv();
  return createClient(url, getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
