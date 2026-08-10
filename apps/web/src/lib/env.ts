/**
 * Akses variabel lingkungan yang aman.
 * Fungsi ini melempar error yang jelas (dalam Bahasa Indonesia) bila variabel
 * belum di-set, sehingga mudah didiagnosis saat pengembangan/deploy.
 */

export function getPublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Variabel Supabase publik belum di-set: NEXT_PUBLIC_SUPABASE_URL dan/atau NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return { url, anonKey };
}

export function getServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY belum di-set (kunci rahasia server).");
  }
  return key;
}
