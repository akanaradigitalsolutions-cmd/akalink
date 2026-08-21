import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser, getRoleFromUser } from "@/lib/auth";
import { seedDefaultCoaIfEmpty } from "@/lib/coa";
import { getAccountBalance, getCashMovements, getBankAccount } from "@/lib/cash";
import { getActiveOutlet } from "@/lib/outlets";
import { KasManager } from "./kas-manager";

export const metadata: Metadata = { title: "Kas & Setoran — AkaLink" };

export default async function KasPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");

  await seedDefaultCoaIfEmpty(tenantId);
  const activeOutlet = await getActiveOutlet(tenantId);
  const [kas, bank, movements, bankAccount] = await Promise.all([
    getAccountBalance(tenantId, "1.1.02"),
    getAccountBalance(tenantId, "1.1.04"),
    getCashMovements(tenantId, 40, activeOutlet?.id ?? null),
    getBankAccount(tenantId),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Kas &amp; Setoran
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pantau uang tunai di laundry dan catat setiap pemindahan ke bank atau
          ke pemilik.
          {activeOutlet && (
            <span className="ml-1 text-slate-400">
              · riwayat outlet 🏪 {activeOutlet.nama}
            </span>
          )}
        </p>
      </div>

      <KasManager
        kas={kas}
        bank={bank}
        movements={movements}
        isOwner={getRoleFromUser(user) === "owner"}
        bankAccount={bankAccount}
      />
    </div>
  );
}
