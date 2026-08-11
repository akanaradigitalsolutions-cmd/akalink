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
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const changed = w !== work || p !== pay;

  function save() {
    setSaved(false);
    start(async () => {
      const res = await updateStatuses({
        id: txId,
        statusPekerjaan: w,
        statusPembayaran: p,
      });
      if (res.ok) setSaved(true);
    });
  }

  return (
    <section className="no-print rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <Group title="Status Pengerjaan" options={WORK} value={w} onPick={setW} />
      <div className="mt-5">
        <Group title="Status Pembayaran" options={PAY} value={p} onPick={setP} />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={save}
          disabled={!changed || pending}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Menyimpan…" : "Simpan Perubahan"}
        </button>
        {saved && !changed && (
          <span className="text-sm font-medium text-green-600">
            ✓ Tersimpan
          </span>
        )}
        {changed && (
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
