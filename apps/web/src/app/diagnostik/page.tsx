/**
 * Halaman diagnostik SEMENTARA untuk memverifikasi environment variables di
 * runtime. TIDAK menampilkan nilai rahasia (hanya panjang & keberadaan).
 * Akan dihapus setelah setup selesai.
 *
 * Akses: /diagnostik?token=akalinkcek
 */
export const dynamic = "force-dynamic";

function ringkasRahasia(v?: string) {
  if (v === undefined) return { ada: false };
  return {
    ada: true,
    kosong: v.length === 0,
    panjang: v.length,
    adaKutip: v.includes('"'),
    adaSpasiTepi: v !== v.trim(),
  };
}

export default async function DiagnostikPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (token !== "akalinkcek") {
    return (
      <main style={{ padding: 24, fontFamily: "monospace" }}>
        Akses ditolak. Tambahkan <code>?token=akalinkcek</code> di URL.
      </main>
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl = process.env.DATABASE_URL;

  let db: Record<string, unknown> = { ada: false };
  if (dbUrl !== undefined) {
    try {
      const u = new URL(dbUrl);
      db = {
        ada: true,
        adaKutip: dbUrl.includes('"'),
        protocol: u.protocol,
        host: u.hostname,
        port: u.port,
        user: u.username,
        passwordAda: u.password.length > 0,
        passwordPanjang: u.password.length,
        database: u.pathname,
      };
    } catch (e) {
      db = {
        ada: true,
        parseGagal: true,
        pesan: e instanceof Error ? e.message : String(e),
        adaKutip: dbUrl.includes('"'),
        awal: dbUrl.slice(0, 24),
      };
    }
  }

  const data = {
    NEXT_PUBLIC_SUPABASE_URL: {
      ada: url !== undefined,
      nilai: url ?? null, // URL bersifat publik, aman ditampilkan
      adaKutip: url?.includes('"') ?? false,
      adaSpasiTepi: url ? url !== url.trim() : false,
      diakhiriSlash: url?.endsWith("/") ?? false,
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ringkasRahasia(anon),
    SUPABASE_SERVICE_ROLE_KEY: ringkasRahasia(service),
    DATABASE_URL: db,
  };

  return (
    <main style={{ padding: 24, fontFamily: "monospace", maxWidth: 720 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        Diagnostik Environment (sementara)
      </h1>
      <p style={{ marginBottom: 12, color: "#64748b" }}>
        Nilai kunci disembunyikan; hanya panjang & keberadaan yang ditampilkan.
      </p>
      <pre
        style={{
          background: "#0f172a",
          color: "#e2e8f0",
          padding: 16,
          borderRadius: 8,
          overflowX: "auto",
          fontSize: 13,
        }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}
