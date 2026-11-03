import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getPengeluaranRincian } from "@/lib/journal";
import { formatRupiah } from "@/lib/format";
import { KeuanganTabs } from "../tabs";

export const metadata: Metadata = { title: "Rincian Biaya — AkaLink" };

export default async function RincianPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  const groups = tenantId ? await getPengeluaranRincian(tenantId) : [];
  const total = groups.reduce((s, g) => s + g.total, 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Keuangan — Rincian Biaya
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Rincian pengeluaran per Kelompok Akun → Kategori → Produk/Item
          (seluruh periode).
        </p>
      </div>
      <KeuanganTabs />

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          Belum ada pengeluaran. Catat biaya di tab Kas & Biaya atau menu
          Pengeluaran.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white">
            <span className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Total Pengeluaran
            </span>
            <span className="text-2xl font-bold">{formatRupiah(total)}</span>
          </div>

          <div className="flex flex-col gap-4">
            {groups.map((g) => (
              <div
                key={g.kode}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {g.nama}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatRupiah(g.total)}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {g.kategori.map((k) => (
                    <div key={k.kode} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          <span className="font-mono text-xs text-slate-400">
                            {k.kode}
                          </span>{" "}
                          {k.nama}
                        </span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {formatRupiah(k.total)}
                        </span>
                      </div>
                      <ul className="mt-1.5 flex flex-col gap-1">
                        {k.produk.map((p) => (
                          <li
                            key={p.nama}
                            className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400"
                          >
                            <span className="truncate">
                              {p.nama}
                              {p.count > 1 && (
                                <span className="ml-1 text-slate-400">
                                  ×{p.count}
                                </span>
                              )}
                            </span>
                            <span>{formatRupiah(p.total)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
