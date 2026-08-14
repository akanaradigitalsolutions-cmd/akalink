"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/format";
import {
  createTransactionPayment,
  checkTransactionPayment,
} from "@/lib/payments-actions";

export function DigitalPayment({
  txId,
  gross,
  feeAdmin,
  net,
  persen,
  existingUrl,
  kembaliDariDoku,
}: {
  txId: string;
  gross: number;
  feeAdmin: number;
  net: number;
  persen: number;
  existingUrl: string | null;
  kembaliDariDoku: boolean;
}) {
  const router = useRouter();
  const [creating, startCreate] = useTransition();
  const [checking, startCheck] = useTransition();
  const [url, setUrl] = useState<string | null>(existingUrl);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();

  function buat() {
    setMsg(undefined);
    startCreate(async () => {
      const res = await createTransactionPayment({ transactionId: txId });
      if (res.ok) {
        setUrl(res.url);
        window.open(res.url, "_blank", "noopener,noreferrer");
        router.refresh();
      } else {
        setMsg({ text: res.error });
      }
    });
  }

  function cek(auto = false) {
    setMsg(undefined);
    startCheck(async () => {
      const res = await checkTransactionPayment({ transactionId: txId });
      if (!res.ok) {
        if (!auto) setMsg({ text: res.error });
        return;
      }
      if (res.status === "success") {
        setMsg({ ok: true, text: "Pembayaran lunas ✓" });
        router.refresh();
      } else if (res.status === "failed") {
        if (!auto) setMsg({ text: "Pembayaran gagal / kadaluarsa." });
        router.refresh();
      } else if (!auto) {
        setMsg({
          text:
            res.status === "none"
              ? "Belum ada pembayaran. Buat dulu QRIS/link bayar."
              : "Belum lunas. Coba lagi beberapa saat setelah konsumen bayar.",
        });
      }
    });
  }

  useEffect(() => {
    if (kembaliDariDoku) cek(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="no-print rounded-2xl border border-brand-200 bg-brand-50/50 p-5 dark:border-brand-900 dark:bg-brand-950/30">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          💳 Pembayaran Digital (QRIS / e-wallet)
        </h3>
        <span className="text-lg font-bold text-brand-700 dark:text-brand-300">
          {formatRupiah(gross)}
        </span>
      </div>

      <div className="mt-3 rounded-xl bg-white p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
        <div className="flex justify-between">
          <span>Konsumen bayar</span>
          <span className="font-medium">{formatRupiah(gross)}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Biaya proses ({persen}%)</span>
          <span>− {formatRupiah(feeAdmin)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-slate-100 pt-1 font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-100">
          <span>Masuk saldo pembayaran</span>
          <span>{formatRupiah(net)}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!url && (
          <button
            onClick={buat}
            disabled={creating}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {creating ? "Membuat…" : "Buat QRIS / Link Bayar"}
          </button>
        )}
        {url && (
          <>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Buka Halaman Bayar
            </a>
            <button
              onClick={() => cek(false)}
              disabled={checking}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {checking ? "Memeriksa…" : "Cek Status Pembayaran"}
            </button>
          </>
        )}
        {msg && (
          <span
            className={
              msg.ok ? "text-sm text-green-600" : "text-sm text-red-600"
            }
          >
            {msg.text}
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-400">
        Konsumen memindai QR / membuka link untuk membayar. Setelah lunas,
        status nota otomatis menjadi Lunas.
      </p>
    </div>
  );
}
