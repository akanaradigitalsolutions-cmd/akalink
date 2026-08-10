import Link from "next/link";
import { Logo } from "@/components/logo";
import { IconReceipt, IconWallet, IconSparkle } from "@/components/icons";

const fitur = [
  {
    icon: IconReceipt,
    judul: "Kasir & Transaksi",
    teks: "Terima order, proses, ambil, dan cetak nota — cepat di HP.",
  },
  {
    icon: IconWallet,
    judul: "Akuntansi Otomatis",
    teks: "Setiap pembayaran langsung menjadi jurnal & laporan keuangan.",
  },
  {
    icon: IconSparkle,
    judul: "Ringan & Modern",
    teks: "Tampilan bersih, ringan, dan enak dipakai di jaringan lemah.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* Dekorasi latar */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-400/20 blur-3xl"
      />

      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Logo size={40} />
        <Link
          href="/masuk"
          className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:text-brand-600 dark:text-slate-300"
        >
          Masuk
        </Link>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-20 pt-10 text-center sm:pt-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-300">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          Akanara Digital Solutions
        </span>

        <h1 className="mt-6 max-w-2xl text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          Kelola laundry Anda dari{" "}
          <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
            satu sistem
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-300">
          Kasir, keuangan, dan notifikasi dalam satu platform yang ringan,
          modern, dan mudah dipakai — cocok untuk laundry masa kini.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/daftar"
            className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700"
          >
            Daftar Laundry Baru
          </Link>
          <Link
            href="/masuk"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Masuk ke Akun
          </Link>
        </div>

        {/* Fitur */}
        <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
          {fitur.map((f) => (
            <div
              key={f.judul}
              className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-bold text-slate-900 dark:text-white">
                {f.judul}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {f.teks}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-400 dark:border-slate-800">
        © {new Date().getFullYear()} AkaLink · Akanara Digital Solutions
      </footer>
    </div>
  );
}
