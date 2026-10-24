"use client";

import { useEffect, useState } from "react";
import {
  buildNotaEscPos,
  buildLabelEscPos,
  type NotaPrintData,
  type LabelPrintData,
} from "@/lib/escpos";
import { printBytes, isWebBluetoothSupported } from "@/lib/bt-print";

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
  const [w, setW] = useState<PaperWidth>(58);
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

/**
 * Cetak langsung ke printer termal Bluetooth (BLE), mis. iWare RPP02N.
 * Mengirim byte ESC/POS via Web Bluetooth — tidak lewat dialog cetak browser.
 * Lebar kolom mengikuti kertas tersimpan (58mm=32, 80mm=42).
 */
type BluetoothPrintProps =
  | { kind?: "nota"; data: NotaPrintData }
  | { kind: "label"; data: LabelPrintData };

export function BluetoothPrint(props: BluetoothPrintProps) {
  const [status, setStatus] = useState<"idle" | "printing" | "ok" | "error">(
    "idle",
  );
  const [msg, setMsg] = useState("");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(isWebBluetoothSupported());
  }, []);

  async function handlePrint() {
    setStatus("printing");
    setMsg("");
    try {
      const saved = Number(localStorage.getItem(PAPER_KEY));
      const cols = saved === 80 ? 42 : 32;
      const bytes =
        props.kind === "label"
          ? buildLabelEscPos(props.data, cols)
          : buildNotaEscPos(props.data, cols);
      await printBytes(bytes);
      setStatus("ok");
      setMsg("Nota terkirim ke printer.");
    } catch (e) {
      // Pengguna membatalkan pemilihan perangkat bukan error yang perlu ditonjolkan.
      const text = e instanceof Error ? e.message : String(e);
      if (/cancel|user cancelled|chooser/i.test(text)) {
        setStatus("idle");
        return;
      }
      setStatus("error");
      setMsg(text);
    }
  }

  if (!supported) {
    return (
      <p className="no-print text-center text-xs text-slate-400">
        Cetak Bluetooth butuh Chrome di Android (atau aplikasi AkaLink).
      </p>
    );
  }

  return (
    <div className="no-print flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handlePrint}
        disabled={status === "printing"}
        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-700"
      >
        {status === "printing" ? "Menyambung…" : "📶 Cetak via Bluetooth"}
      </button>
      {status === "ok" && (
        <p className="text-center text-xs font-medium text-green-600">{msg}</p>
      )}
      {status === "error" && (
        <p className="max-w-xs text-center text-xs text-red-600">{msg}</p>
      )}
    </div>
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
