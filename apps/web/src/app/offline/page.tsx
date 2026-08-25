import type { Metadata } from "next";
import { LogoMark } from "@/components/logo";

export const metadata: Metadata = { title: "Offline — AkaLink" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center dark:bg-slate-950">
      <LogoMark size={56} />
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">
        Anda sedang offline
      </h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Koneksi internet terputus. AkaLink butuh koneksi untuk memuat data
        terbaru. Periksa jaringan Anda, lalu coba lagi.
      </p>
      <a
        href="/dashboard"
        className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Coba Lagi
      </a>
    </main>
  );
}
