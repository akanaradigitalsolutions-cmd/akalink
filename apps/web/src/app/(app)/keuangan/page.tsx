import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getCoa, seedDefaultCoaIfEmpty } from "@/lib/coa";
import { CoaTree } from "./coa-tree";
import { KeuanganTabs } from "./tabs";

export const metadata: Metadata = {
  title: "Keuangan — AkaLink",
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
          Bagan akun (Chart of Accounts). Setiap pergerakan uang diposting ke
          akun-akun ini sebagai jurnal.
        </p>
      </header>

      <KeuanganTabs />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="hidden grid-cols-12 gap-4 border-b border-slate-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800 sm:grid">
          <div className="col-span-2">Kode</div>
          <div className="col-span-6">Nama Akun</div>
          <div className="col-span-2">Tipe</div>
          <div className="col-span-2 text-right">Saldo Normal</div>
        </div>
        <CoaTree
          accounts={akun.map((a) => ({
            id: a.id,
            kode: a.kode,
            nama: a.nama,
            tipe: a.tipe,
            saldoNormal: a.saldoNormal,
            parentId: a.parentId,
            isKas: a.isKas,
          }))}
        />
      </div>

      <p className="text-center text-xs text-slate-400">
        Jurnal otomatis, Buku Besar, Laba-Rugi, dan Neraca hadir di langkah
        2.2–2.3.
      </p>
    </div>
  );
}
