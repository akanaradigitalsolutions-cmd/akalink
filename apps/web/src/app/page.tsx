import Link from "next/link";

/**
 * Halaman landing publik AkaLink.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
          Akanara Digital Solutions
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-brand-700 dark:text-brand-300">
          AkaLink
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">
          Platform manajemen laundry multi-tenant — kasir, keuangan, dan
          notifikasi dalam satu sistem yang ringan dan modern.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/daftar"
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Daftar Laundry Baru
        </Link>
        <Link
          href="/masuk"
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Masuk
        </Link>
      </div>

      <footer className="text-sm text-slate-400 dark:text-slate-500">
        Phase 0 — Fondasi &amp; multi-tenancy.
      </footer>
    </main>
  );
}
