import type { Metadata } from "next";
import Link from "next/link";
import { getAllCoinTopups, getTopupSummary, type CoinTopupStatus } from "@/lib/platform";
import { formatRupiah, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Monitor Isi Ulang Koin — Admin AkaLink" };

const STATUS_CLS: Record<string, string> = {
  success: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  expired: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const STATUS_LABEL: Record<string, string> = {
  success: "Berhasil",
  pending: "Menunggu",
  failed: "Gagal",
  expired: "Kedaluwarsa",
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "success", label: "Berhasil" },
  { key: "pending", label: "Menunggu" },
  { key: "failed", label: "Gagal" },
];

export default async function AdminTopupPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = status && ["success", "pending", "failed", "expired"].includes(status)
    ? (status as CoinTopupStatus)
    : undefined;

  const [rows, summary] = await Promise.all([
    getAllCoinTopups({ status: active, limit: 300 }),
    getTopupSummary(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Monitor Isi Ulang Koin
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Semua transaksi isi ulang Saldo Koin (via DOKU) seluruh laundry.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Berhasil" value={formatRupiah(summary.successTotal)} sub={`${summary.successCount} transaksi`} tone="pos" />
        <Stat label="Menunggu" value={formatRupiah(summary.pendingTotal)} sub={`${summary.pendingCount} transaksi`} tone="warn" />
        <Stat label="Gagal / Kedaluwarsa" value={formatRupiah(summary.failedTotal)} sub={`${summary.failedCount} transaksi`} />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const on = (f.key === "all" && !active) || f.key === active;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/admin/topup" : `/admin/topup?status=${f.key}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                on
                  ? "bg-brand-600 text-white"
                  : "border border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          {rows.length} transaksi {active ? `(${STATUS_LABEL[active]})` : "terbaru"}
        </h3>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Belum ada transaksi isi ulang.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                    <Link href={`/admin/tenant/${r.tenantId}`} className="truncate hover:underline">
                      {r.tenantNama}
                    </Link>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_CLS[r.status] ?? ""}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {r.invoiceNumber}
                    {r.channel ? ` · ${r.channel}` : ""} · {formatDateTime(r.createdAt)}
                    {r.paidAt ? ` · dibayar ${formatDateTime(r.paidAt)}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-slate-800 dark:text-slate-100">
                  {formatRupiah(r.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
        {rows.length >= 300 && (
          <p className="mt-3 text-xs text-slate-400">
            Menampilkan 300 transaksi terbaru.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "warn";
}) {
  const color =
    tone === "pos"
      ? "text-green-600 dark:text-green-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-slate-900 dark:text-white";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}
