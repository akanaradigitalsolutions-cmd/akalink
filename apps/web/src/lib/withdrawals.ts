import "server-only";

import { desc, eq } from "drizzle-orm";
import { getDb, tenants, withdrawals } from "@akalink/db";

export type WithdrawalRow = {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  bankNama: string;
  bankRekening: string;
  bankAtasNama: string;
  status: "pending" | "success" | "failed" | "expired";
  createdAt: string;
};

/** Saldo dana pembayaran digital yang siap ditarik. */
export async function getDigitalBalance(tenantId: string): Promise<number> {
  const db = getDb();
  const [t] = await db
    .select({ saldo: tenants.saldoPembayaran })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return t?.saldo ?? 0;
}

export async function getWithdrawals(
  tenantId: string,
  limit = 30,
): Promise<WithdrawalRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: withdrawals.id,
      amount: withdrawals.amount,
      fee: withdrawals.fee,
      netAmount: withdrawals.netAmount,
      bankNama: withdrawals.bankNama,
      bankRekening: withdrawals.bankRekening,
      bankAtasNama: withdrawals.bankAtasNama,
      status: withdrawals.status,
      createdAt: withdrawals.createdAt,
    })
    .from(withdrawals)
    .where(eq(withdrawals.tenantId, tenantId))
    .orderBy(desc(withdrawals.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}
