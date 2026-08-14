import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getDigitalBalance, getWithdrawals } from "@/lib/withdrawals";
import { getPaymentFeeConfig } from "@/lib/payments";
import { WITHDRAW_FEE, MIN_WITHDRAW, PG_ADMIN_PERSEN } from "@/lib/payment-fee";
import { DanaClient } from "./dana-client";

export const metadata: Metadata = { title: "Dana Masuk — AkaLink" };

export default async function DanaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");
  if (getRoleFromUser(user) !== "owner") redirect("/dashboard");

  const [saldo, riwayat, feeCfg] = await Promise.all([
    getDigitalBalance(tenantId),
    getWithdrawals(tenantId, 30),
    getPaymentFeeConfig(tenantId),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Dana Pembayaran Digital
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Dana masuk dari pembayaran konsumen (QRIS/e-wallet) setelah dipotong
          biaya proses {PG_ADMIN_PERSEN}%. Tarik ke rekening bank Anda kapan
          saja.
        </p>
      </div>

      <DanaClient
        saldo={saldo}
        riwayat={riwayat}
        aktif={feeCfg.aktif}
        withdrawFee={WITHDRAW_FEE}
        minWithdraw={MIN_WITHDRAW}
      />
    </div>
  );
}
