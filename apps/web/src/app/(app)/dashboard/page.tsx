import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { IconReceipt, IconWallet, IconUsers, IconChart } from "@/components/icons";

export const metadata: Metadata = {
  title: "Beranda — AkaLink",
};

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");

  const tenantId = getTenantIdFromUser(user);

  let me: Awaited<ReturnType<typeof getTenantContext>>["me"] | undefined;
  let tenant: Awaited<ReturnType<typeof getTenantContext>>["tenant"] | undefined;
  let loadError: string | undefined;
  try {
    const ctx = await getTenantContext(user.id, tenantId);
    me = ctx.me;
    tenant = ctx.tenant;
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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white sm:p-8">
        <p className="text-sm text-brand-100">Selamat datang kembali,</p>
        <h2 className="mt-1 text-2xl font-bold">{namaUser} 👋</h2>
        <p className="mt-2 max-w-lg text-sm text-brand-100">
          Mulai dengan menyiapkan <strong>Katalog Layanan</strong> Anda di menu
          Layanan, lalu kita lanjut ke transaksi kasir.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge label={`Paket: ${tenant?.tier ?? "—"}`} />
          <Badge label={`Status: ${tenant?.status ?? "—"}`} />
          {tenant?.kota && <Badge label={tenant.kota} />}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<IconReceipt />} label="Transaksi Hari Ini" />
        <StatCard icon={<IconWallet />} label="Omzet Hari Ini" />
        <StatCard icon={<IconUsers />} label="Konsumen" />
        <StatCard icon={<IconChart />} label="Pekerjaan Selesai" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Informasi Bisnis
        </h3>
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <Info label="Nama Laundry" value={tenant?.nama} />
          <Info label="Kota" value={tenant?.kota} />
          <Info label="Pemilik" value={me?.nama} />
          <Info label="Peran" value={me?.role} />
        </dl>
      </section>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium capitalize text-white backdrop-blur">
      {label}
    </span>
  );
}

function StatCard({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
          {icon}
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          Segera
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-300 dark:text-slate-700">
        —
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-semibold capitalize text-slate-900 dark:text-white">
        {value ?? "—"}
      </dd>
    </div>
  );
}
