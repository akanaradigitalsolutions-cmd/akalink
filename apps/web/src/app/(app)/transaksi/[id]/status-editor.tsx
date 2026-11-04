"use client";

import { useState, useTransition } from "react";
import { updateStatuses } from "@/lib/transactions-actions";
import { formatRupiah } from "@/lib/format";

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
  grandTotal,
  paidSoFar,
}: {
  txId: string;
  work: string;
  pay: string;
  grandTotal: number;
  paidSoFar: number;
}) {
  const [w, setW] = useState(work);
  const [p, setP] = useState(pay);
  const [metode, setMetode] = useState("");
  const [bayar, setBayar] = useState("");
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string>();

  const sisa = Math.max(0, grandTotal - paidSoFar);
  const changed = w !== work || p !== pay;
  const becomingDp = p === "dp" && pay !== "dp";
  const becomingLunas = p === "lunas" && pay !== "lunas";
  // Butuh metode saat mencatat uang masuk (DP atau Lunas).
  const needMetode = (becomingDp || becomingLunas) && !metode;
  const dpAmount = Number(bayar.replace(/[^0-9]/g, "")) || 0;
  const needDpAmount = becomingDp && !(dpAmount > 0);

  function save() {
    setSaved(false);
    setErr(undefined);
    if (needMetode) {
      setErr("Pilih metode pembayaran dulu.");
      return;
    }
    if (needDpAmount) {
      setErr("Isi jumlah DP yang dibayar.");
      return;
    }
    start(async () => {
      const res = await updateStatuses({
        id: txId,
        statusPekerjaan: w,
        statusPembayaran: p,
        metodeBayar: becomingDp || becomingLunas ? metode : undefined,
        jumlahBayar: becomingDp ? dpAmount : undefined,
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
            if (v === "belum_dibayar") {
              setMetode("");
              setBayar("");
            }
          }}
        />
      </div>

      {/* Info sudah dibayar / sisa tagihan */}
      {paidSoFar > 0 && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Sudah dibayar:{" "}
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatRupiah(paidSoFar)}
          </span>{" "}
          · Sisa:{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {formatRupiah(sisa)}
          </span>
        </p>
      )}

      {/* DP: jumlah dibayar + metode */}
      {becomingDp && (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-900/60 dark:bg-brand-950/20">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Jumlah DP Dibayar
          </label>
          <input
            value={bayar}
            onChange={(e) => {
              setBayar(e.target.value.replace(/[^0-9]/g, ""));
              setErr(undefined);
            }}
            inputMode="numeric"
            placeholder={`maks ${formatRupiah(sisa)}`}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          {dpAmount > 0 && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {dpAmount > sisa
                ? `Dibatasi ke sisa ${formatRupiah(sisa)}.`
                : `Sisa setelah DP: ${formatRupiah(sisa - dpAmount)}`}
            </p>
          )}
          <MetodePicker metode={metode} setMetode={setMetode} setErr={setErr} />
        </div>
      )}

      {/* Lunas: metode (mencatat sisa tagihan) */}
      {becomingLunas && (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-900/60 dark:bg-brand-950/20">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Metode Pembayaran
            {sisa !== grandTotal && (
              <span className="ml-1 font-normal normal-case text-slate-400">
                · mencatat sisa {formatRupiah(sisa)}
              </span>
            )}
          </p>
          <MetodePicker
            metode={metode}
            setMetode={setMetode}
            setErr={setErr}
            hideLabel
          />
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={!changed || pending || needMetode || needDpAmount}
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

function MetodePicker({
  metode,
  setMetode,
  setErr,
  hideLabel = false,
}: {
  metode: string;
  setMetode: (v: string) => void;
  setErr: (v: string | undefined) => void;
  hideLabel?: boolean;
}) {
  return (
    <div className={hideLabel ? "" : "mt-3"}>
      {!hideLabel && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Metode Pembayaran
        </p>
      )}
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
          : "Tunai → Kas Outlet; Transfer/QRIS → rekening laundry (Bank)."}
      </p>
    </div>
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
