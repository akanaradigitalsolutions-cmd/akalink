import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getPromos } from "@/lib/promos";
import { getTenantSettings } from "@/lib/settings";
import { PromoManager } from "./promo-manager";

export const metadata: Metadata = { title: "Promo — AkaLink" };

export default async function PromoPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");
  if (getRoleFromUser(user) !== "owner") redirect("/dashboard");

  const s = await getTenantSettings(tenantId);
  if (!s?.fiturPromo) redirect("/pengaturan");

  const promos = await getPromos(tenantId);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Kode Promo / Voucher
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Buat kode diskon (persen atau nominal). Kasir memasukkan kode di POS
          untuk memberi potongan otomatis.
        </p>
      </div>
      <PromoManager promos={promos} />
    </div>
  );
}
