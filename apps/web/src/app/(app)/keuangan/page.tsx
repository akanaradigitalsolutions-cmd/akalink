import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getCoa, seedDefaultCoaIfEmpty } from "@/lib/coa";

export const metadata: Metadata = {
  title: "Keuangan — AkaLink",
};

const TIPE_LABEL: Record<string, string> = {
  aset: "Aset",
  kewajiban: "Kewajiban",
  modal: "Modal",
  pendapatan: "Pendapatan",
  beban: "Beban",
};

const TIPE_COLOR: Record<string, string> = {
  aset: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  kewajiban: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  modal: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  pendapatan: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  beban: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export default async function KeuanganPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");

  // Buat COA default otomatis bila belum ada.
  await seedDefaultCoaIfEmpty(tenantId);
  const akun = await getCoa(tenantId);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Keuangan — Data Akun (COA)
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Bagan akun (Chart of Accounts). Setiap pergerakan uang akan
          diposting ke akun-akun ini sebagai jurnal (langkah berikutnya).
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="hidden grid-cols-12 gap-4 border-b border-slate-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800 sm:grid">
          <div className="col-span-2">Kode</div>
          <div className="col-span-6">Nama Akun</div>
          <div className="col-span-2">Tipe</div>
          <div className="col-span-2 text-right">Saldo Normal</div>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {akun.map((a) => {
            const depth = a.kode.split(".").length - 1;
            const isHeader = depth === 0;
            return (
              <li
                key={a.id}
                className="grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-12 sm:items-center sm:gap-4"
              >
                <div className="col-span-2 font-mono text-sm text-slate-500">
                  {a.kode}
                </div>
                <div
                  className={
                    isHeader
                      ? "col-span-6 font-bold text-slate-900 dark:text-white"
                      : "col-span-6 text-slate-700 dark:text-slate-200"
                  }
                  style={{ paddingLeft: `${depth * 16}px` }}
                >
                  {a.nama}
                  {a.isKas && (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800">
                      kas
                    </span>
                  )}
                </div>
                <div className="col-span-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TIPE_COLOR[a.tipe]}`}
                  >
                    {TIPE_LABEL[a.tipe]}
                  </span>
                </div>
                <div className="col-span-2 text-left text-sm capitalize text-slate-500 sm:text-right">
                  {a.saldoNormal}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-center text-xs text-slate-400">
        Jurnal otomatis, Buku Besar, Laba-Rugi, dan Neraca hadir di langkah
        2.2–2.3.
      </p>
    </div>
  );
}
