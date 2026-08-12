import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import {
  getSalesReport,
  presetRange,
  normalizeYmd,
} from "@/lib/laporan";
import { formatRupiah } from "@/lib/format";
import { IconReceipt, IconWallet, IconChart, IconTag } from "@/components/icons";
import { PeriodPicker } from "./period-picker";
import { LaporanTabs } from "./tabs";

export const metadata: Metadata = { title: "Laporan — AkaLink" };

function labelHari(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(d);
}

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; dari?: string; sampai?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");

  const sp = await searchParams;

  // Tentukan rentang: dari/sampai kustom menang; jika tidak, pakai preset.
  const isCustom = !!(sp.dari || sp.sampai);
  const preset = sp.preset ?? (isCustom ? "" : "bulan");
  const base = presetRange(preset || "bulan");
  const dari = normalizeYmd(sp.dari, base.dari);
  const sampai = normalizeYmd(sp.sampai, base.sampai);

  const rep = await getSalesReport(tenantId, dari, sampai);
  const r = rep.ringkasan;

  const lunas = rep.statusBayar.find((s) => s.status === "lunas");
  const belum = rep.statusBayar
    .filter((s) => s.status !== "lunas")
    .reduce(
      (acc, s) => ({
        jumlah: acc.jumlah + s.jumlah,
        total: acc.total + s.total,
      }),
      { jumlah: 0, total: 0 },
    );

  const maxHari = Math.max(1, ...rep.perHari.map((h) => h.omzet));
  const maxLayanan = Math.max(1, ...rep.layanan.map((l) => l.omzet));

  const csvHref = `/api/laporan-csv?dari=${dari}&sampai=${sampai}`;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Laporan Penjualan
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Periode {labelHari(dari)} – {labelHari(sampai)}
          </p>
        </div>
        <a
          href={csvHref}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          ⬇️ Ekspor CSV
        </a>
      </div>

      <LaporanTabs />

      <PeriodPicker dari={dari} sampai={sampai} preset={preset} />

      {/* KPI */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<IconWallet />}
          label="Total Omzet"
          value={formatRupiah(r.omzet)}
        />
        <Kpi
          icon={<IconReceipt />}
          label="Jumlah Transaksi"
          value={String(r.jumlah)}
        />
        <Kpi
          icon={<IconChart />}
          label="Rata-rata / Transaksi"
          value={formatRupiah(r.rataRata)}
        />
        <Kpi
          icon={<IconTag />}
          label="Total Diskon"
          value={formatRupiah(r.diskon)}
        />
      </section>

      {r.jumlah === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          Belum ada transaksi pada periode ini.
        </div>
      ) : (
        <>
          {/* Status pembayaran */}
          <section className="grid gap-4 sm:grid-cols-2">
            <PayCard
              tone="ok"
              label="Sudah Lunas"
              total={lunas?.total ?? 0}
              jumlah={lunas?.jumlah ?? 0}
            />
            <PayCard
              tone="warn"
              label="Belum Lunas (Piutang)"
              total={belum.total}
              jumlah={belum.jumlah}
            />
          </section>

          {/* Grafik omzet harian */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Omzet Harian
            </h2>
            <div className="flex items-end gap-1.5 overflow-x-auto pb-2">
              {rep.perHari.map((h) => (
                <div
                  key={h.hari}
                  className="flex min-w-[28px] flex-1 flex-col items-center gap-1"
                  title={`${labelHari(h.hari)}: ${formatRupiah(h.omzet)} (${h.jumlah} transaksi)`}
                >
                  <div className="flex h-32 w-full items-end">
                    <div
                      className="w-full rounded-t bg-brand-500/80 transition-all hover:bg-brand-600"
                      style={{
                        height: `${Math.max(4, (h.omzet / maxHari) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="whitespace-nowrap text-[10px] text-slate-400">
                    {labelHari(h.hari)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Layanan terlaris */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Layanan Terlaris
            </h2>
            <ul className="flex flex-col gap-3">
              {rep.layanan.map((l) => (
                <li key={l.nama} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {l.nama}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatRupiah(l.omzet)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${(l.omzet / maxLayanan) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatQty(l.qty)} unit · {l.jumlah} transaksi
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <p className="text-center text-xs text-slate-400">
        Angka omzet dihitung dari nilai transaksi (grand total) pada periode
        terpilih. Lihat pencatatan akrual lengkap di menu{" "}
        <Link href="/keuangan" className="text-brand-600 hover:underline">
          Keuangan
        </Link>
        .
      </p>
    </div>
  );
}

function formatQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
        {icon}
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function PayCard({
  tone,
  label,
  total,
  jumlah,
}: {
  tone: "ok" | "warn";
  label: string;
  total: number;
  jumlah: number;
}) {
  const color =
    tone === "ok"
      ? "text-green-600 dark:text-green-400"
      : "text-amber-600 dark:text-amber-400";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>
        {formatRupiah(total)}
      </p>
      <p className="text-xs text-slate-400">{jumlah} transaksi</p>
    </div>
  );
}
