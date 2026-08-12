import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getCashFlow, presetRange, normalizeYmd } from "@/lib/laporan";
import { formatRupiah } from "@/lib/format";
import { PeriodPicker } from "../period-picker";
import { LaporanTabs } from "../tabs";

export const metadata: Metadata = { title: "Arus Kas — AkaLink" };

function labelHari(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(d);
}

export default async function ArusKasPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; dari?: string; sampai?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");

  const sp = await searchParams;
  const isCustom = !!(sp.dari || sp.sampai);
  const preset = sp.preset ?? (isCustom ? "" : "bulan");
  const base = presetRange(preset || "bulan");
  const dari = normalizeYmd(sp.dari, base.dari);
  const sampai = normalizeYmd(sp.sampai, base.sampai);

  const cf = await getCashFlow(tenantId, dari, sampai);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Laporan Arus Kas
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Periode {labelHari(dari)} – {labelHari(sampai)}
        </p>
      </div>

      <LaporanTabs />

      <PeriodPicker
        dari={dari}
        sampai={sampai}
        preset={preset}
        basePath="/laporan/arus-kas"
      />

      {/* KPI */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Saldo Awal" value={formatRupiah(cf.saldoAwal)} />
        <Kpi
          label="Kas Masuk"
          value={formatRupiah(cf.masukTotal)}
          tone="in"
        />
        <Kpi
          label="Kas Keluar"
          value={formatRupiah(cf.keluarTotal)}
          tone="out"
        />
        <Kpi
          label="Saldo Akhir"
          value={formatRupiah(cf.saldoAkhir)}
          strong
        />
      </section>

      {/* Perubahan bersih */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">
            Perubahan kas bersih periode ini
          </span>
          <span
            className={
              cf.net >= 0
                ? "text-lg font-bold text-green-600"
                : "text-lg font-bold text-red-600"
            }
          >
            {cf.net >= 0 ? "+ " : "− "}
            {formatRupiah(Math.abs(cf.net))}
          </span>
        </div>
      </div>

      {cf.masuk.length === 0 && cf.keluar.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          Belum ada pergerakan kas pada periode ini.
        </div>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          <FlowCard
            title="Kas Masuk"
            tone="in"
            rows={cf.masuk}
            total={cf.masukTotal}
          />
          <FlowCard
            title="Kas Keluar"
            tone="out"
            rows={cf.keluar}
            total={cf.keluarTotal}
          />
        </section>
      )}

      {/* Saldo per akun kas */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Saldo per Akun Kas
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="px-5 py-2 font-medium">Akun</th>
                <th className="px-5 py-2 text-right font-medium">Saldo Awal</th>
                <th className="px-5 py-2 text-right font-medium">Masuk</th>
                <th className="px-5 py-2 text-right font-medium">Keluar</th>
                <th className="px-5 py-2 text-right font-medium">Saldo Akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {cf.perKas.map((k) => (
                <tr key={k.nama}>
                  <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">
                    {k.nama}
                  </td>
                  <td className="px-5 py-2.5 text-right text-slate-500">
                    {formatRupiah(k.saldoAwal)}
                  </td>
                  <td className="px-5 py-2.5 text-right text-green-600">
                    {k.masuk ? formatRupiah(k.masuk) : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-right text-red-600">
                    {k.keluar ? formatRupiah(k.keluar) : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold text-slate-900 dark:text-white">
                    {formatRupiah(k.saldoAkhir)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-center text-xs text-slate-400">
        Arus kas dihitung dari mutasi akun kas &amp; bank di jurnal (pelunasan,
        pengeluaran, modal, prive, transfer). Transfer antar kas tampil di kedua
        sisi namun tidak mengubah total kas.
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone?: "in" | "out";
  strong?: boolean;
}) {
  const color =
    tone === "in"
      ? "text-green-600 dark:text-green-400"
      : tone === "out"
        ? "text-red-600 dark:text-red-400"
        : strong
          ? "text-brand-700 dark:text-brand-300"
          : "text-slate-900 dark:text-white";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function FlowCard({
  title,
  tone,
  rows,
  total,
}: {
  title: string;
  tone: "in" | "out";
  rows: { kategori: string; nilai: number }[];
  total: number;
}) {
  const max = Math.max(1, ...rows.map((r) => r.nilai));
  const bar = tone === "in" ? "bg-green-500" : "bg-red-500";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          {title}
        </h2>
        <span
          className={
            tone === "in"
              ? "text-sm font-bold text-green-600"
              : "text-sm font-bold text-red-600"
          }
        >
          {formatRupiah(total)}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">Tidak ada.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.kategori} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-200">
                  {r.kategori}
                </span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {formatRupiah(r.nilai)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${bar}`}
                  style={{ width: `${(r.nilai / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
