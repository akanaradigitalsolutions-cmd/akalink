import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getExpensePicker } from "@/lib/expense";
import { KeuanganTabs } from "../tabs";
import { FinanceForms } from "./finance-forms";

export const metadata: Metadata = { title: "Kas & Biaya — AkaLink" };

export default async function CatatPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");

  const { groups, kas } = await getExpensePicker(tenantId);
  const canAdd = getRoleFromUser(user) === "owner";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Keuangan — Kas & Biaya
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Catat pengeluaran, setoran modal, prive, dan transfer kas. Setiap
          entri otomatis membuat jurnal.
        </p>
      </div>
      <KeuanganTabs />

      <FinanceForms kas={kas} groups={groups} canAdd={canAdd} />

      <p className="text-center text-xs text-slate-400">
        Entri yang tersimpan bisa dilihat di tab Jurnal & Rincian Biaya, serta
        memengaruhi Laba-Rugi & Neraca.
      </p>
    </div>
  );
}
