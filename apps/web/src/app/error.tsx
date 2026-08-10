"use client";

/**
 * Error boundary global. Menangkap error render agar tidak muncul layar putih,
 * dan menampilkan pesan + tombol coba lagi.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Terjadi kesalahan
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Maaf, ada yang tidak beres saat memuat halaman.
      </p>
      {error?.message && (
        <pre className="max-w-full overflow-x-auto rounded-lg bg-slate-100 p-3 text-left text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {error.message}
        </pre>
      )}
      <button
        onClick={reset}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Coba lagi
      </button>
    </main>
  );
}
