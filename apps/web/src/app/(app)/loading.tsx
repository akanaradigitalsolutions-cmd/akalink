/**
 * Fallback saat berpindah halaman di area aplikasi. Muncul instan (Suspense)
 * sementara data halaman tujuan diambil di server — memberi umpan balik agar
 * navigasi terasa responsif. Kerangka sidebar/topbar tetap dari layout.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-brand-600 dark:border-slate-700 dark:border-t-brand-400" />
        <p className="text-sm text-slate-400">Memuat…</p>
      </div>
    </div>
  );
}
