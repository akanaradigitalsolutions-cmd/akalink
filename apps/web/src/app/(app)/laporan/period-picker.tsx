"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const PRESETS: { v: string; label: string }[] = [
  { v: "hari", label: "Hari Ini" },
  { v: "7hari", label: "7 Hari" },
  { v: "30hari", label: "30 Hari" },
  { v: "bulan", label: "Bulan Ini" },
];

const inputBase =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export function PeriodPicker({
  dari,
  sampai,
  preset,
  basePath = "/laporan",
  outlet = "",
  outlets = [],
}: {
  dari: string;
  sampai: string;
  preset: string;
  basePath?: string;
  outlet?: string;
  outlets?: { id: string; nama: string }[];
}) {
  const router = useRouter();
  const [d1, setD1] = useState(dari);
  const [d2, setD2] = useState(sampai);

  function go(params: Record<string, string>) {
    // Selalu bawa filter outlet aktif kecuali diganti eksplisit.
    const merged: Record<string, string> = { outlet, ...params };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    router.push(`${basePath}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      {outlets.length > 1 && (
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <span className="text-xs font-medium text-slate-500">Outlet:</span>
          <select
            value={outlet}
            onChange={(e) => go({ dari, sampai, outlet: e.target.value })}
            className={inputBase}
          >
            <option value="">Semua Outlet</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nama}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.v}
            type="button"
            onClick={() => go({ preset: p.v })}
            className={
              preset === p.v
                ? "rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white"
                : "rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs text-slate-500 sm:flex-none">
          Dari
          <input
            type="date"
            value={d1}
            max={d2}
            onChange={(e) => setD1(e.target.value)}
            className={`${inputBase} w-full`}
          />
        </label>
        <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs text-slate-500 sm:flex-none">
          Sampai
          <input
            type="date"
            value={d2}
            min={d1}
            onChange={(e) => setD2(e.target.value)}
            className={`${inputBase} w-full`}
          />
        </label>
        <button
          type="button"
          onClick={() => go({ dari: d1, sampai: d2 })}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
        >
          Terapkan
        </button>
      </div>
      </div>
    </div>
  );
}
