import type { Metadata } from "next";
import Link from "next/link";
import { getPlatformStats, getAllTenants } from "@/lib/platform";
import { formatRupiah, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Admin AkaLink" };

const STATUS_CLS: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  trial: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  suspended: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export default async function AdminHome() {
  const [stats, tenants] = await Promise.all([
    getPlatformStats(),
    getAllTenants(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Dashboard Platform
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ringkasan seluruh laundry pengguna AkaLink.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Laundry" value={String(stats.totalTenant)} sub={`${stats.aktif} aktif · ${stats.trial} trial · ${stats.suspended} suspend`} />
        <Stat label="Pendapatan Platform" value={formatRupiah(stats.totalKoinTerpakai)} sub="dari pemakaian koin" tone="pos" />
        <Stat label="Total Saldo Koin" value={formatRupiah(stats.totalSaldoKoin)} sub="dompet semua laundry" />
        <Stat label="Total Transaksi" value={stats.totalTransaksi.toLocaleString("id-ID")} sub="nota se-platform" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Daftar Laundry ({tenants.length})
        </h3>
        {tenants.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada laundry.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tenants.map((t) => (
              <Link
                key={t.id}
                href={`/admin/tenant/${t.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                    <span className="truncate">{t.nama}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_CLS[t.status] ?? ""}`}>
                      {t.status}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {t.kota ?? "—"} · {t.tier} · {t.outletCount} outlet · {t.txCount} nota · sejak {formatDateTime(t.createdAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-semibold ${t.saldoKoin <= 0 ? "text-red-600" : "text-slate-800 dark:text-slate-100"}`}>
                    {formatRupiah(t.saldoKoin)}
                  </p>
                  <p className="text-xs text-slate-400">saldo koin</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "pos" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone === "pos" ? "text-green-600 dark:text-green-400" : "text-slate-900 dark:text-white"}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}
