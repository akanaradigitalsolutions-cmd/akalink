"use client";

import { useState, useTransition } from "react";
import { updateStatuses } from "@/lib/transactions-actions";

const WORK: [string, string][] = [
  ["belum_dikerjakan", "Belum Dikerjakan"],
  ["proses", "Proses"],
  ["selesai", "Selesai"],
  ["diambil", "Diambil"],
];
const PAY: [string, string][] = [
  ["belum_dibayar", "Belum Dibayar"],
  ["dp", "DP"],
  ["lunas", "Lunas"],
];
const METODE: [string, string, string][] = [
  ["tunai", "Tunai", "Masuk ke Kas Outlet (kas kasir)"],
  ["transfer", "Transfer Bank", "Masuk ke rekening laundry (Bank)"],
  ["qris", "QRIS", "Masuk ke rekening laundry (Bank)"],
];

export function StatusEditor({
  txId,
  work,
  pay,
}: {
  txId: string;
  work: string;
  pay: string;
}) {
  const [w, setW] = useState(work);
  const [p, setP] = useState(pay);
  const [metode, setMetode] = useState("");
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string>();

  const changed = w !== work || p !== pay;
  // Butuh konfirmasi metode saat baru menjadi Lunas (bukan yang sudah lunas).
  const becomingLunas = p === "lunas" && pay !== "lunas";
  const needMetode = becomingLunas && !metode;

  function save() {
    setSaved(false);
    setErr(undefined);
    if (needMetode) {
      setErr("Pilih metode pembayaran dulu.");
      return;
    }
    start(async () => {
      const res = await updateStatuses({
        id: txId,
        statusPekerjaan: w,
        statusPembayaran: p,
        metodeBayar: becomingLunas ? metode : undefined,
      });
      if (res.ok) setSaved(true);
      else setErr(res.error);
    });
  }

  return (
    <section className="no-print rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <Group title="Status Pengerjaan" options={WORK} value={w} onPick={setW} />
      <div className="mt-5">
        <Group
          title="Status Pembayaran"
          options={PAY}
          value={p}
          onPick={(v) => {
            setP(v);
            setErr(undefined);
            if (v !== "lunas") setMetode("");
          }}
        />
      </div>

      {/* Konfirmasi metode pembayaran saat menandai Lunas. */}
      {becomingLunas && (
        <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-900/60 dark:bg-brand-950/20">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Metode Pembayaran
          </p>
          <div className="flex flex-wrap gap-2">
            {METODE.map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setMetode(val);
                  setErr(undefined);
                }}
                className={
                  metode === val
                    ? "rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white"
                    : "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800"
                }
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {metode
              ? METODE.find((m) => m[0] === metode)?.[2]
              : "Tunai masuk ke Kas Outlet; Transfer/QRIS masuk ke rekening laundry (Bank)."}
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={!changed || pending || needMetode}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Menyimpan…" : "Simpan Perubahan"}
        </button>
        {saved && !changed && (
          <span className="text-sm font-medium text-green-600">
            ✓ Tersimpan
          </span>
        )}
        {err && <span className="text-sm text-red-600">{err}</span>}
        {changed && !err && (
          <span className="text-sm text-amber-600">Ada perubahan belum disimpan</span>
        )}
      </div>
    </section>
  );
}

function Group({
  title,
  options,
  value,
  onPick,
}: {
  title: string;
  options: [string, string][];
  value: string;
  onPick: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => onPick(val)}
            className={
              value === val
                ? "rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white"
                : "rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            }
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
