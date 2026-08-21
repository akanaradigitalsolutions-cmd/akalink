"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/format";
import { setGaji } from "@/lib/salary-actions";
import type { StaffSalaryRow } from "@/lib/salary";

const BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
function fmtTgl(s: string | null): string {
  if (!s) return "—";
  const [y, m, d] = s.slice(0, 10).split("-");
  const mi = Number(m) - 1;
  if (!y || mi < 0 || mi > 11) return s;
  return `${Number(d)} ${BULAN[mi]} ${y}`;
}

export function GajiManager({
  staff,
  totalGaji,
  totalKasbon,
  totalOverdue,
}: {
  staff: StaffSalaryRow[];
  totalGaji: number;
  totalKasbon: number;
  totalOverdue: number;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total Gaji / Bulan" value={formatRupiah(totalGaji)} />
        <Stat
          label="Sisa Kasbon Aktif"
          value={formatRupiah(totalKasbon)}
          tone="amber"
        />
        <Stat
          label="Kasbon Jatuh Tempo"
          value={formatRupiah(totalOverdue)}
          tone={totalOverdue > 0 ? "red" : "muted"}
        />
      </div>

      <div className="flex flex-col gap-3">
        {staff.map((s) => (
          <StaffCard key={s.id} s={s} />
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "amber" | "red" | "muted";
}) {
  const cls =
    tone === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "red"
        ? "text-red-600 dark:text-red-400"
        : tone === "muted"
          ? "text-slate-400"
          : "text-slate-900 dark:text-white";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${cls}`}>{value}</p>
    </div>
  );
}

function StaffCard({ s }: { s: StaffSalaryRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [gaji, setGajiVal] = useState(String(s.gaji || ""));
  const [saved, setSaved] = useState(false);

  const input =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";

  function simpanGaji() {
    setSaved(false);
    start(async () => {
      await setGaji({ employeeId: s.id, gaji: Number(gaji) || 0 });
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white">
            {s.nama}{" "}
            <span className="text-xs capitalize text-slate-400">· {s.role}</span>
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
            {s.kasbonBelum > 0 ? (
              <span className="text-amber-600 dark:text-amber-400">
                Sisa kasbon: {formatRupiah(s.kasbonBelum)}
              </span>
            ) : (
              <span className="text-slate-400">Tidak ada kasbon aktif</span>
            )}
            {s.kasbonOverdue > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                Jatuh tempo {formatRupiah(s.kasbonOverdue)}
              </span>
            )}
            {s.nextPayDate ? (
              <span className="text-slate-500 dark:text-slate-400">
                · Gajian: {fmtTgl(s.nextPayDate)}
                {s.daysUntil !== null && s.daysUntil >= 0 ? ` (${s.daysUntil}h)` : ""}
              </span>
            ) : (
              <span className="text-slate-400">· Tgl mulai belum diatur</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Gaji</span>
          <input
            value={gaji}
            onChange={(e) => {
              setGajiVal(e.target.value.replace(/[^0-9]/g, ""));
              setSaved(false);
            }}
            inputMode="numeric"
            placeholder="0"
            className={`${input} w-32 text-right`}
          />
          <button
            onClick={simpanGaji}
            disabled={pending}
            className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {saved ? "✓" : "Simpan"}
          </button>
        </div>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <Link
          href={`/gaji/${s.id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          Kelola kasbon &amp; riwayat →
        </Link>
      </div>
    </div>
  );
}
