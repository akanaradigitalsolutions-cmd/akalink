import "server-only";

import { and, desc, eq } from "drizzle-orm";
import {
  getDb,
  paymentOrders,
  transactions,
  tenants,
  type PaymentOrder,
} from "@akalink/db";
import { postJournal, hasJournal } from "@/lib/journal";
import {
  seedDefaultCoaIfEmpty,
  ensureCoaAccount,
  AKUN_BIAYA_PG,
  AKUN_DANA_DIGITAL,
} from "@/lib/coa";
import { awardPointsOnPayment } from "@/lib/loyalty";
import { PG_ADMIN_PERSEN } from "@/lib/payment-fee";

/**
 * ============================================================================
 *  Pembayaran nota konsumen via DOKU (QRIS / e-wallet / VA)
 * ----------------------------------------------------------------------------
 *  Biaya proses (MDR) = 3,5% (ketentuan platform), dipotong tiap transaksi.
 *  Dana bersih masuk ke "Saldo Pembayaran Digital" laundry, dan bisa ditarik
 *  ke rekening bank (biaya transfer dikenakan saat withdraw).
 *
 *  Jurnal pelunasan digital:
 *    Dr 1.1.05 Dana Pembayaran Digital       (bersih)
 *    Dr 5.3   Beban Biaya Pembayaran Digital (biaya 3,5%)
 *      Cr 1.2 Piutang Usaha                  (kotor)
 * ============================================================================
 */

export type PaymentFeeConfig = { aktif: boolean; persen: number };

export function hitungFee(gross: number): { feeAdmin: number; net: number } {
  const feeAdmin = Math.round((gross * PG_ADMIN_PERSEN) / 100);
  const net = Math.max(0, gross - feeAdmin);
  return { feeAdmin, net };
}

export async function getPaymentFeeConfig(
  tenantId: string,
): Promise<PaymentFeeConfig> {
  const db = getDb();
  const [t] = await db
    .select({ aktif: tenants.fiturBayarDigital })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return { aktif: t?.aktif ?? false, persen: PG_ADMIN_PERSEN };
}

/** Pesanan pembayaran terbaru untuk sebuah transaksi (untuk tampilan). */
export async function getLatestPaymentOrder(
  tenantId: string,
  transactionId: string,
): Promise<PaymentOrder | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(paymentOrders)
    .where(
      and(
        eq(paymentOrders.tenantId, tenantId),
        eq(paymentOrders.transactionId, transactionId),
      ),
    )
    .orderBy(desc(paymentOrders.createdAt))
    .limit(1);
  return row ?? null;
}

/**
 * Selesaikan payment order yang SUKSES: tandai lunas, tambah saldo pembayaran,
 * posting jurnal pelunasan (idempoten), beri poin loyalitas bila aktif.
 * Aman dipanggil berulang (webhook / cek status manual).
 */
export async function settlePaymentOrder(order: PaymentOrder): Promise<void> {
  if (order.status === "success") return;
  const db = getDb();
  const tenantId = order.tenantId;

  const [tx] = await db
    .select({
      id: transactions.id,
      noNota: transactions.noNota,
      grandTotal: transactions.grandTotal,
      consumerId: transactions.consumerId,
    })
    .from(transactions)
    .where(and(eq(transactions.id, order.transactionId), eq(transactions.tenantId, tenantId)))
    .limit(1);
  if (!tx) return;

  await seedDefaultCoaIfEmpty(tenantId);
  await ensureCoaAccount(tenantId, AKUN_BIAYA_PG);
  await ensureCoaAccount(tenantId, AKUN_DANA_DIGITAL);

  const fee = order.feeAdmin;
  const gross = order.amount;
  const net = order.netAmount;

  const alreadyPelunasan = await hasJournal(tenantId, "pelunasan", tx.id);

  const [t] = await db
    .select({
      poinRupiah: tenants.poinRupiah,
      fiturPoin: tenants.fiturPoin,
      saldoPembayaran: tenants.saldoPembayaran,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  const poinRupiah = t?.poinRupiah ?? 0;
  const berikanPoin =
    !!t?.fiturPoin && poinRupiah > 0 && !!tx.consumerId && Number(tx.grandTotal) > 0;

  await db.transaction(async (trx) => {
    await trx
      .update(paymentOrders)
      .set({ status: "success", paidAt: new Date() })
      .where(eq(paymentOrders.id, order.id));

    await trx
      .update(transactions)
      .set({ statusPembayaran: "lunas", updatedAt: new Date() })
      .where(and(eq(transactions.id, tx.id), eq(transactions.tenantId, tenantId)));

    // Tambah saldo dana pembayaran digital (siap ditarik).
    const [cur] = await trx
      .select({ saldo: tenants.saldoPembayaran })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .for("update")
      .limit(1);
    await trx
      .update(tenants)
      .set({ saldoPembayaran: (cur?.saldo ?? 0) + net, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));

    if (!alreadyPelunasan && gross > 0) {
      const lines: { kode: string; debit?: number; kredit?: number }[] = [
        { kode: AKUN_DANA_DIGITAL, debit: net }, // Dr Dana Pembayaran Digital
      ];
      if (fee > 0) lines.push({ kode: AKUN_BIAYA_PG, debit: fee }); // Dr Beban PG
      lines.push({ kode: "1.2", kredit: gross }); // Cr Piutang (kotor)
      await postJournal(trx, tenantId, {
        keterangan: `Pelunasan digital ${tx.noNota}`,
        refType: "pelunasan",
        refId: tx.id,
        lines,
      });
    }

    if (berikanPoin && tx.consumerId) {
      await awardPointsOnPayment(
        trx,
        tenantId,
        tx.consumerId,
        tx.id,
        Number(tx.grandTotal),
        poinRupiah,
      );
    }
  });
}
