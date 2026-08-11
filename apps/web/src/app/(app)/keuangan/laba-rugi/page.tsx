import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getLedger, netByTipe } from "@/lib/reports";
import { formatRupiah } from "@/lib/format";
import { KeuanganTabs } from "../tabs";

export const metadata: Metadata = { title: "Laba-Rugi — AkaLink" };

export default async function LabaRugiPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  const rows = tenantId ? await getLedger(tenantId) : [];

  const pendapatan = netByTipe(rows, "pendapatan");
  const beban = netByTipe(rows, "beban");
  const laba = pendapatan.total - beban.total;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Keuangan — Laba-Rugi
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pendapatan dikurangi beban (seluruh periode).
        </p>
      </div>
      <KeuanganTabs />

      <div className="flex flex-col gap-4">
        <Section title="Pendapatan" items={pendapatan.items} total={pendapatan.total} />
        <Section title="Beban" items={beban.items} total={beban.total} />

        <div
          className={`flex items-center justify-between rounded-2xl p-5 text-white ${
            laba >= 0
              ? "bg-gradient-to-br from-green-600 to-green-800"
              : "bg-gradient-to-br from-red-600 to-red-800"
          }`}
        >
          <span className="text-lg font-bold">
            {laba >= 0 ? "Laba Bersih" : "Rugi Bersih"}
          </span>
          <span className="text-2xl font-bold">{formatRupiah(Math.abs(laba))}</span>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  total,
}: {
  title: string;
  items: { kode: string; nama: string; nilai: number }[];
  total: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800">
        {title}
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-4 text-sm text-slate-400">Belum ada.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((it) => (
            <li key={it.kode} className="flex justify-between px-5 py-2.5 text-sm">
              <span className="text-slate-700 dark:text-slate-200">
                <span className="font-mono text-xs text-slate-400">
                  {it.kode}
                </span>{" "}
                {it.nama}
              </span>
              <span className="text-slate-800 dark:text-slate-100">
                {formatRupiah(it.nilai)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-between border-t border-slate-200 px-5 py-3 text-sm font-bold dark:border-slate-700">
        <span>Total {title}</span>
        <span>{formatRupiah(total)}</span>
      </div>
    </div>
  );
}
