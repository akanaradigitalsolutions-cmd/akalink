"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/format";
import type { RevenuePoint } from "@/lib/dashboard";

// Bagan batang omzet — SVG murni. Bisa beralih Harian (7 hari) / Bulanan (6 bulan).
export function RevenueChart({
  daily,
  monthly,
}: {
  daily: RevenuePoint[];
  monthly: RevenuePoint[];
}) {
  const [mode, setMode] = useState<"hari" | "bulan">("hari");
  const data = mode === "hari" ? daily : monthly;

  const max = Math.max(1, ...data.map((d) => d.omzet));
  const total = data.reduce((s, d) => s + d.omzet, 0);
  const curIdx = data.length - 1;
  const curValue = data[curIdx]?.omzet ?? 0;

  // Geometri
  const W = 700;
  const H = 180;
  const padB = 26;
  const padT = 8;
  const gap = 14;
  const n = data.length;
  const bw = (W - gap * (n - 1)) / n;
  const chartH = H - padB - padT;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            {mode === "hari" ? "Omzet 7 Hari Terakhir" : "Omzet 6 Bulan Terakhir"}
          </h3>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {formatRupiah(total)}
            <span className="ml-2 text-xs font-medium text-slate-400">total</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-400">
              {mode === "hari" ? "Hari ini" : "Bulan ini"}
            </p>
            <p className="text-lg font-bold text-brand-600 dark:text-brand-400">
              {formatRupiah(curValue)}
            </p>
          </div>
          {/* Pengalih Harian / Bulanan */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            <ToggleBtn active={mode === "hari"} onClick={() => setMode("hari")}>
              Harian
            </ToggleBtn>
            <ToggleBtn active={mode === "bulan"} onClick={() => setMode("bulan")}>
              Bulanan
            </ToggleBtn>
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-44 w-full min-w-[520px]"
          role="img"
          aria-label={`Bagan omzet ${mode === "hari" ? "7 hari" : "6 bulan"} terakhir`}
        >
          {data.map((d, i) => {
            const h = Math.max(2, (d.omzet / max) * chartH);
            const x = i * (bw + gap);
            const y = padT + (chartH - h);
            const isCur = i === curIdx;
            return (
              <g key={`${mode}-${i}`}>
                <title>{`${d.label} — ${formatRupiah(d.omzet)}`}</title>
                <rect
                  x={x}
                  y={padT}
                  width={bw}
                  height={chartH}
                  rx={6}
                  className="fill-slate-100 dark:fill-slate-800"
                />
                <rect
                  x={x}
                  y={y}
                  width={bw}
                  height={h}
                  rx={6}
                  className={
                    isCur
                      ? "fill-brand-600 dark:fill-brand-500"
                      : "fill-brand-300 dark:fill-brand-700"
                  }
                />
                <text
                  x={x + bw / 2}
                  y={H - 8}
                  textAnchor="middle"
                  className={
                    isCur
                      ? "fill-brand-700 text-[13px] font-semibold dark:fill-brand-300"
                      : "fill-slate-400 text-[13px]"
                  }
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
        active
          ? "bg-brand-600 text-white"
          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
