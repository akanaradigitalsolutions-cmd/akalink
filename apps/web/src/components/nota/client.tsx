"use client";

import { useEffect, useState } from "react";

/** Otomatis membuka dialog cetak saat halaman dibuka dengan ?print=1. */
export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, []);
  return null;
}

const PAPER_KEY = "akalink_paper_mm";
type PaperWidth = 58 | 80;

/**
 * Kontrol cetak untuk printer struk termal: pilih lebar kertas (58/80mm),
 * disimpan per perangkat, dan atur ukuran halaman cetak agar pas (tidak
 * terpotong). Sekaligus tombol cetak / auto-cetak.
 */
export function ThermalPrint({
  auto = false,
  label = "🖨️ Cetak Nota",
}: {
  auto?: boolean;
  label?: string;
}) {
  const [w, setW] = useState<PaperWidth>(80);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = Number(localStorage.getItem(PAPER_KEY));
    if (saved === 58 || saved === 80) setW(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(PAPER_KEY, String(w));
  }, [w, ready]);

  // Auto-cetak (dari tombol "Cetak Nota") setelah lebar kertas siap.
  useEffect(() => {
    if (!auto || !ready) return;
    const t = setTimeout(() => window.print(), 450);
    return () => clearTimeout(t);
  }, [auto, ready]);

  const btn = (v: PaperWidth) =>
    v === w
      ? "bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white"
      : "px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800";

  return (
    <>
      {/* Atur ukuran halaman cetak sesuai lebar kertas terpilih. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print{@page{size:${w}mm auto;margin:3mm}}`,
        }}
      />
      <div className="no-print flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Lebar kertas:</span>
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
            <button type="button" onClick={() => setW(58)} className={btn(58)}>
              58mm
            </button>
            <button type="button" onClick={() => setW(80)} className={btn(80)}>
              80mm
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          {label}
        </button>
      </div>
    </>
  );
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
