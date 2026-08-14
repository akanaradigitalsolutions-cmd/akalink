import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getMemberTypes } from "@/lib/members";
import { getTenantSettings } from "@/lib/settings";
import { MemberManager } from "./member-manager";

export const metadata: Metadata = { title: "Member — AkaLink" };

export default async function MemberPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");
  if (getRoleFromUser(user) !== "owner") redirect("/dashboard");

  const s = await getTenantSettings(tenantId);
  if (!s?.fiturMember) redirect("/pengaturan");

  const types = await getMemberTypes(tenantId);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Jenis Member
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Buat tingkatan member dengan diskon otomatis. Konsumen yang menjadi
          member akan mendapat diskonnya saat transaksi (bisa diterapkan kasir
          di POS).
        </p>
      </div>
      <MemberManager types={types} />
    </div>
  );
}
