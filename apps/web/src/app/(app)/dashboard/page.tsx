import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { keluar } from "@/lib/auth-actions";

export const metadata: Metadata = {
  title: "Dashboard — AkaLink",
};

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");

  const tenantId = getTenantIdFromUser(user);

  // Ambil data secara defensif: bila query gagal, tampilkan pesan yang bisa
  // dibaca, bukan layar putih.
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

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Dashboard</p>
          <h1 className="text-2xl font-bold text-brand-700 dark:text-brand-300">
            {tenant?.nama ?? "AkaLink"}
          </h1>
        </div>
        <form action={keluar}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Keluar
          </button>
        </form>
      </header>

      {loadError ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/40">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">
            Berhasil login, tetapi gagal memuat data
          </h2>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">
            Autentikasi bekerja, namun query database bermasalah. Detail:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-red-100 p-3 text-xs text-red-900 dark:bg-red-900/40 dark:text-red-200">
            {loadError}
          </pre>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950/40">
            <h2 className="text-lg font-semibold text-green-800 dark:text-green-300">
              🎉 Anda berhasil masuk!
            </h2>
            <p className="mt-1 text-sm text-green-700 dark:text-green-400">
              Autentikasi &amp; isolasi tenant sudah berfungsi. Fitur POS akan
              dibangun pada Phase 1.
            </p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <InfoCard label="Nama Anda" value={me?.nama ?? "—"} />
            <InfoCard label="Peran" value={me?.role ?? "—"} />
            <InfoCard label="Nama Laundry" value={tenant?.nama ?? "—"} />
            <InfoCard label="Kota" value={tenant?.kota ?? "—"} />
            <InfoCard label="Paket" value={tenant?.tier ?? "—"} />
            <InfoCard label="Status" value={tenant?.status ?? "—"} />
          </section>
        </>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500">
        tenant_id: <code>{tenantId ?? "(tidak ada)"}</code>
      </p>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-medium capitalize text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}
