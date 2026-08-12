"use client";

import { useEffect } from "react";

/** Otomatis membuka dialog cetak saat halaman dibuka dengan ?print=1. */
export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, []);
  return null;
}

export function PrintButton({ label = "🖨️ Cetak" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {label}
    </button>
  );
}

export function WhatsappButton({
  hp,
  message,
  label = "💬 Kirim WhatsApp",
  variant = "solid",
}: {
  hp?: string | null;
  message: string;
  label?: string;
  variant?: "solid" | "outline";
}) {
  if (!hp) return null;
  const url = `https://wa.me/${hp}?text=${encodeURIComponent(message)}`;
  const cls =
    variant === "outline"
      ? "no-print inline-flex items-center gap-2 rounded-lg border border-green-600 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/40"
      : "no-print inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700";
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={cls}>
      {label}
    </a>
  );
}
