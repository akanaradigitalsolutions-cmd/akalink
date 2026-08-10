/**
 * Halaman status sementara untuk Phase 0.
 * Tujuannya sederhana: membuktikan bahwa fondasi (Next.js + Tailwind)
 * sudah berjalan. Halaman ini akan diganti dengan halaman landing /
 * login yang sebenarnya pada langkah Auth (Phase 0.5).
 */

const langkahPhase0 = [
  { label: "0.2 · Skeleton proyek (Next.js + Tailwind)", selesai: true },
  { label: "0.3 · Skema database (Drizzle)", selesai: false },
  { label: "0.4 · Row-Level Security (isolasi tenant)", selesai: false },
  { label: "0.5 · Autentikasi (daftar, login, undang staf)", selesai: false },
  { label: "0.6 · Layout, i18n, dan CI", selesai: false },
];

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
          Platform manajemen laundry multi-tenant. Fondasi sedang dibangun —
          berikut progres <strong>Phase&nbsp;0</strong>.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white/60 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Checklist Phase 0 — Fondasi
        </h2>
        <ul className="flex flex-col gap-3">
          {langkahPhase0.map((langkah) => (
            <li key={langkah.label} className="flex items-center gap-3">
              <span
                aria-hidden
                className={
                  langkah.selesai
                    ? "flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white"
                    : "flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-300 text-xs text-slate-400 dark:border-slate-600"
                }
              >
                {langkah.selesai ? "✓" : ""}
              </span>
              <span
                className={
                  langkah.selesai
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-slate-500 dark:text-slate-400"
                }
              >
                {langkah.label}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="text-sm text-slate-400 dark:text-slate-500">
        Jika Anda melihat halaman ini berjalan, artinya skeleton proyek berhasil. 🎉
      </footer>
    </main>
  );
}
