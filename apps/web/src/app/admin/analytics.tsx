"use client";

import type { MonthPoint } from "@/lib/platform";

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
function labelBulan(k: string): string {
  const m = Number(k.split("-")[1]);
  return BULAN[m - 1] ?? k;
}
function rpShort(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(n);
}

function Bars({
  points,
  color,
  fmt,
}: {
  points: { label: string; value: number }[];
  color: string;
  fmt: (n: number) => string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div className="flex h-36 items-end gap-2">
      {points.map((p, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            {p.value > 0 ? fmt(p.value) : ""}
          </span>
          <div
            className="w-3/5 rounded-t"
            style={{
              height: `${(p.value / max) * 100}%`,
              background: color,
              minHeight: p.value > 0 ? 4 : 0,
            }}
          />
          <span className="text-[10px] text-slate-400">{p.label}</span>
        </div>
      ))}
    </div>
  );
}

function Card({
  title,
  total,
  children,
}: {
  title: string;
  total: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        <span className="text-xs text-slate-400">{total}</span>
      </div>
      {children}
    </div>
  );
}

export function PlatformAnalytics({ data }: { data: MonthPoint[] }) {
  const labels = data.map((d) => labelBulan(d.bulan));
  const nota = data.map((d, i) => ({ label: labels[i], value: d.nota }));
  const koin = data.map((d, i) => ({ label: labels[i], value: d.koinTerpakai }));
  const topup = data.map((d, i) => ({ label: labels[i], value: d.topup }));

  const totalNota = data.reduce((a, d) => a + d.nota, 0);
  const totalKoin = data.reduce((a, d) => a + d.koinTerpakai, 0);
  const totalTopup = data.reduce((a, d) => a + d.topup, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Nota / Transaksi" total={`${totalNota.toLocaleString("id-ID")} total`}>
        <Bars points={nota} color="#2563eb" fmt={(n) => n.toLocaleString("id-ID")} />
      </Card>
      <Card title="Koin Terpakai (pendapatan)" total={`Rp ${rpShort(totalKoin)}`}>
        <Bars points={koin} color="#16a34a" fmt={rpShort} />
      </Card>
      <Card title="Isi Ulang Koin (berhasil)" total={`Rp ${rpShort(totalTopup)}`}>
        <Bars points={topup} color="#d97706" fmt={rpShort} />
      </Card>
    </div>
  );
}
