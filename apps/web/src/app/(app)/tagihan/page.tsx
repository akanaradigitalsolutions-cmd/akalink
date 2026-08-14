import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getCoinConfig, getCoinLedger } from "@/lib/app-coin";
import { isDokuConfigured } from "@/lib/doku";
import { TagihanClient } from "./tagihan-client";

export const metadata: Metadata = { title: "Saldo AkaLink — AkaLink" };

export default async function TagihanPage({
  searchParams,
}: {
  searchParams: Promise<{ doku?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");
  // Halaman billing khusus pemilik.
  if (getRoleFromUser(user) !== "owner") redirect("/dashboard");

  const sp = await searchParams;
  const [config, ledger] = await Promise.all([
    getCoinConfig(tenantId),
    getCoinLedger(tenantId, 60),
  ]);
  const dokuAktif = isDokuConfigured();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Saldo AkaLink
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Saldo koin aplikasi. Setiap nota yang dibuat dan setiap nota yang
          dikirim via WhatsApp memotong saldo ini.
        </p>
      </div>

      <TagihanClient
        config={config}
        ledger={ledger}
        dokuAktif={dokuAktif}
        kembaliDariDoku={sp.doku === "selesai"}
      />
    </div>
  );
}
