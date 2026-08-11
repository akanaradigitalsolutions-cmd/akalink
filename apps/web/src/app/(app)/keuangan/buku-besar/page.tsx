import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getLedger } from "@/lib/reports";
import { formatRupiah } from "@/lib/format";
import { KeuanganTabs } from "../tabs";

export const metadata: Metadata = { title: "Buku Besar — AkaLink" };

export default async function BukuBesarPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  const rows = tenantId ? await getLedger(tenantId) : [];

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalKredit = rows.reduce((s, r) => s + r.kredit, 0);
  const balanced = Math.round((totalDebit - totalKredit) * 100) === 0;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Keuangan — Buku Besar
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ringkasan saldo tiap akun (neraca saldo) dari seluruh jurnal.
        </p>
      </div>
      <KeuanganTabs />

      {rows.length === 0 ? (
        <Empty />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-12 gap-2 border-b border-slate-100 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800">
            <div className="col-span-6">Akun</div>
            <div className="col-span-2 text-right">Debit</div>
            <div className="col-span-2 text-right">Kredit</div>
            <div className="col-span-2 text-right">Saldo</div>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => (
              <li
                key={r.kode}
                className="grid grid-cols-12 gap-2 px-5 py-2.5 text-sm"
              >
                <div className="col-span-6 text-slate-700 dark:text-slate-200">
                  <span className="font-mono text-xs text-slate-400">
                    {r.kode}
                  </span>{" "}
                  {r.nama}
                </div>
                <div className="col-span-2 text-right text-slate-600 dark:text-slate-300">
                  {r.debit ? formatRupiah(r.debit) : ""}
                </div>
                <div className="col-span-2 text-right text-slate-600 dark:text-slate-300">
                  {r.kredit ? formatRupiah(r.kredit) : ""}
                </div>
                <div className="col-span-2 text-right font-semibold text-slate-900 dark:text-white">
                  {formatRupiah(r.saldo)}
                </div>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-12 gap-2 border-t border-slate-200 px-5 py-3 text-sm font-bold dark:border-slate-700">
            <div className="col-span-6">
              Total{" "}
              <span
                className={
                  balanced
                    ? "ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-950 dark:text-green-300"
                    : "ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
                }
              >
                {balanced ? "Seimbang ✓" : "Tidak seimbang!"}
              </span>
            </div>
            <div className="col-span-2 text-right">
              {formatRupiah(totalDebit)}
            </div>
            <div className="col-span-2 text-right">
              {formatRupiah(totalKredit)}
            </div>
            <div className="col-span-2" />
          </div>
        </div>
      )}
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      Belum ada data. Buat transaksi untuk mengisi buku besar.
    </div>
  );
}
