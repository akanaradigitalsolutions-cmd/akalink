"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const inputBase =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

const KERJA = [
  { v: "", label: "Semua Pengerjaan" },
  { v: "belum_dikerjakan", label: "Belum Dikerjakan" },
  { v: "proses", label: "Proses" },
  { v: "selesai", label: "Selesai" },
  { v: "diambil", label: "Diambil" },
];
const BAYAR = [
  { v: "", label: "Semua Pembayaran" },
  { v: "belum_dibayar", label: "Belum Dibayar" },
  { v: "dp", label: "DP" },
  { v: "lunas", label: "Lunas" },
];

export function TransaksiFilters({
  q,
  kerja,
  bayar,
  outlet,
  outlets = [],
}: {
  q: string;
  kerja: string;
  bayar: string;
  outlet?: string;
  outlets?: { id: string; nama: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState(q);

  function push(params: Record<string, string>) {
    const merged: Record<string, string> = {
      q,
      kerja,
      bayar,
      outlet: outlet ?? "",
      ...params,
    };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    const qs = sp.toString();
    start(() => router.push(qs ? `/transaksi?${qs}` : "/transaksi"));
  }

  const aktifFilter = q || kerja || bayar || outlet;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          push({ q: text });
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Cari no. nota atau nama konsumen…"
          className={`${inputBase} flex-1`}
        />
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <select
            value={kerja}
            onChange={(e) => push({ kerja: e.target.value })}
            className={`${inputBase} w-full sm:w-auto`}
          >
            {KERJA.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={bayar}
            onChange={(e) => push({ bayar: e.target.value })}
            className={`${inputBase} w-full sm:w-auto`}
          >
            {BAYAR.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
          {outlets.length > 1 && (
            <select
              value={outlet ?? ""}
              onChange={(e) => push({ outlet: e.target.value })}
              className={`${inputBase} w-full sm:w-auto`}
            >
              <option value="">Semua Outlet</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nama}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={pending}
            className="col-span-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 sm:col-auto"
          >
            Cari
          </button>
        </div>
      </form>

      {aktifFilter && (
        <button
          type="button"
          onClick={() => {
            setText("");
            start(() => router.push("/transaksi"));
          }}
          className="w-fit text-xs font-medium text-brand-600 hover:underline"
        >
          ✕ Reset filter
        </button>
      )}
    </div>
  );
}
