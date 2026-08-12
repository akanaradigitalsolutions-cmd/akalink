import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { getDashboardStats } from "@/lib/dashboard";
import { searchTransactions } from "@/lib/transactions";
import {
  getOutlets,
  getActiveOutlet,
  backfillOrphanTransactions,
} from "@/lib/outlets";
import {
  formatRupiah,
  formatDateTime,
  LABEL_STATUS_KERJA,
  LABEL_STATUS_BAYAR,
} from "@/lib/format";
import {
  IconReceipt,
  IconWallet,
  IconChart,
  IconPlus,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "Beranda — AkaLink",
};

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);

  let me: Awaited<ReturnType<typeof getTenantContext>>["me"] | undefined;
  let stats: Awaited<ReturnType<typeof getDashboardStats>> | undefined;
  let recent: Awaited<ReturnType<typeof searchTransactions>> = [];
  let loadError: string | undefined;
  let outletNama: string | null = null;
  let outletCount = 0;
  try {
    if (tenantId) {
      const [ctx, active, outletList] = await Promise.all([
        getTenantContext(user.id, tenantId),
        getActiveOutlet(tenantId),
        getOutlets(tenantId),
      ]);
      me = ctx.me;
      outletNama = active?.nama ?? null;
      outletCount = outletList.length;
      // Tautkan transaksi lama tanpa outlet ke outlet pertama (sekali saja).
      if (outletList[0])
        await backfillOrphanTransactions(tenantId, outletList[0].id);
      stats = await getDashboardStats(tenantId, active?.id);
      recent = await searchTransactions(tenantId, {
        outlet: active?.id,
        limit: 6,
      });
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  const namaUser = me?.nama ?? user.email ?? "Pengguna";

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/40">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">
          Gagal memuat data
        </h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-red-100 p-3 text-xs text-red-900 dark:bg-red-900/40 dark:text-red-200">
          {loadError}
        </pre>
      </div>
    );
  }

  const s = stats!;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {/* Sambutan + aksi cepat */}
      <section className="flex flex-col gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="text-sm text-brand-100">Selamat datang kembali,</p>
          <h2 className="mt-1 text-2xl font-bold">{namaUser} 👋</h2>
          <p className="mt-1 text-sm text-brand-100">
            {outletCount > 1 && outletNama
              ? `Ringkasan hari ini untuk 🏪 ${outletNama}.`
              : "Berikut ringkasan laundry Anda hari ini."}
          </p>
        </div>
        <Link
          href="/transaksi/baru"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50"
        >
          <IconPlus className="h-4 w-4" />
          Transaksi Baru
        </Link>
      </section>

      {/* Statistik hari ini */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<IconReceipt />}
          label="Transaksi Hari Ini"
          value={String(s.todayCount)}
        />
        <StatCard
          icon={<IconWallet />}
          label="Omzet Hari Ini"
          value={formatRupiah(s.todayOmzet)}
        />
        <StatCard
          icon={<IconWallet />}
          label="Belum Dibayar"
          value={formatRupiah(s.unpaidTotal)}
          sub={`${s.unpaidCount} transaksi`}
          tone={s.unpaidCount > 0 ? "warn" : "default"}
        />
        <StatCard
          icon={<IconChart />}
          label="Terlambat"
          value={String(s.lateCount)}
          sub="perlu diselesaikan"
          tone={s.lateCount > 0 ? "danger" : "default"}
        />
      </section>

      {/* Status pekerjaan */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Status Pekerjaan
          </h3>
          <Link
            href="/transaksi"
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Lihat semua →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <WorkStat
            label="Belum Dikerjakan"
            value={s.kerja.belum_dikerjakan}
            color="text-slate-500"
          />
          <WorkStat label="Proses" value={s.kerja.proses} color="text-blue-600" />
          <WorkStat
            label="Selesai"
            value={s.kerja.selesai}
            color="text-green-600"
          />
        </div>
      </section>

      {/* Transaksi terakhir */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Transaksi Terakhir
          </h3>
          <Link
            href="/transaksi"
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Lihat semua →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Belum ada transaksi.
            </p>
            <Link
              href="/transaksi/baru"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              <IconPlus className="h-4 w-4" />
              Buat Transaksi
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {recent.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/transaksi/${t.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {t.noNota}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t.consumerNama ?? "Umum"} ·{" "}
                      {formatDateTime(t.orderDiterima)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:inline">
                      {LABEL_STATUS_KERJA[t.statusPekerjaan]}
                    </span>
                    <span
                      className={
                        t.statusPembayaran === "lunas"
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
                      }
                    >
                      {LABEL_STATUS_BAYAR[t.statusPembayaran]}
                    </span>
                    <span className="w-24 text-right font-bold text-slate-900 dark:text-white">
                      {formatRupiah(t.grandTotal)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "warn" | "danger";
}) {
  const valueColor =
    tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-slate-900 dark:text-white";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
        {icon}
      </div>
      <p className={`mt-4 text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function WorkStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
