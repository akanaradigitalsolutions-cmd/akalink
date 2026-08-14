"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, tenants, withdrawals } from "@akalink/db";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { postJournal } from "@/lib/journal";
import {
  seedDefaultCoaIfEmpty,
  ensureCoaAccount,
  AKUN_BIAYA_PG,
  AKUN_DANA_DIGITAL,
} from "@/lib/coa";
import { WITHDRAW_FEE, MIN_WITHDRAW } from "@/lib/payment-fee";

export type WithdrawResult =
  | { ok: true; netAmount: number; saldoSesudah: number }
  | { ok: false; error: string };

/**
 * Tarik dana pembayaran digital ke rekening bank. Biaya transfer (ketentuan
 * platform) dipotong. Mencatat jurnal:
 *   Dr 1.1.04 Bank (bersih) + Dr 5.3 Beban (biaya transfer) / Cr 1.1.05 Dana.
 */
export async function requestWithdraw(input: {
  amount: number | string;
  bankNama: string;
  bankRekening: string;
  bankAtasNama: string;
}): Promise<WithdrawResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId)
    return { ok: false, error: "Sesi tidak valid. Silakan masuk lagi." };
  if (getRoleFromUser(user) !== "owner")
    return { ok: false, error: "Hanya pemilik yang dapat menarik dana." };

  const amount = Math.floor(Number(input.amount) || 0);
  const bankNama = String(input.bankNama ?? "").trim();
  const bankRekening = String(input.bankRekening ?? "").trim();
  const bankAtasNama = String(input.bankAtasNama ?? "").trim();

  if (!bankNama || !bankRekening || !bankAtasNama)
    return { ok: false, error: "Lengkapi data bank (bank, no. rekening, atas nama)." };
  if (amount < MIN_WITHDRAW)
    return {
      ok: false,
      error: `Minimal penarikan Rp${MIN_WITHDRAW.toLocaleString("id-ID")}.`,
    };
  if (amount <= WITHDRAW_FEE)
    return { ok: false, error: "Jumlah penarikan harus lebih besar dari biaya transfer." };

  const fee = WITHDRAW_FEE;
  const net = amount - fee;

  await seedDefaultCoaIfEmpty(tenantId);
  await ensureCoaAccount(tenantId, AKUN_BIAYA_PG);
  await ensureCoaAccount(tenantId, AKUN_DANA_DIGITAL);

  const db = getDb();
  try {
    const result = await db.transaction(async (trx) => {
      const [cur] = await trx
        .select({ saldo: tenants.saldoPembayaran })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .for("update")
        .limit(1);
      const saldo = cur?.saldo ?? 0;
      if (amount > saldo) throw new Error("Saldo tidak mencukupi.");

      const saldoSesudah = saldo - amount;
      await trx
        .update(tenants)
        .set({ saldoPembayaran: saldoSesudah, updatedAt: new Date() })
        .where(eq(tenants.id, tenantId));

      const [w] = await trx
        .insert(withdrawals)
        .values({
          tenantId,
          amount,
          fee,
          netAmount: net,
          bankNama,
          bankRekening,
          bankAtasNama,
          status: "success",
          processedAt: new Date(),
          createdBy: null,
        })
        .returning({ id: withdrawals.id });

      // Jurnal: Dr Bank (bersih) + Dr Beban (biaya) / Cr Dana Digital (kotor).
      const lines: { kode: string; debit?: number; kredit?: number }[] = [
        { kode: "1.1.04", debit: net },
      ];
      if (fee > 0) lines.push({ kode: AKUN_BIAYA_PG, debit: fee });
      lines.push({ kode: AKUN_DANA_DIGITAL, kredit: amount });
      await postJournal(trx, tenantId, {
        keterangan: `Penarikan dana ke ${bankNama} ${bankRekening}`,
        refType: "withdraw",
        refId: w.id,
        lines,
      });

      return saldoSesudah;
    });

    revalidatePath("/dana");
    revalidatePath("/dashboard");
    return { ok: true, netAmount: net, saldoSesudah: result };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal menarik dana.",
    };
  }
}
