import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getB2bClients } from "@/lib/b2b";
import { B2bList } from "./b2b-list";

export const metadata: Metadata = { title: "B2B Korporat — AkaLink" };

export default async function B2bPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");
  if (getRoleFromUser(user) !== "owner") redirect("/dashboard");

  const clients = await getB2bClients(tenantId);
  const totalPiutang = clients.reduce((s, c) => s + c.outstanding, 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          B2B Korporat
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kelola klien perusahaan, transaksi tempo, dan tagihan bulanan
          (invoice).
        </p>
      </div>

      <B2bList clients={clients} totalPiutang={totalPiutang} />
    </div>
  );
}
