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
import { seedDefaultCoaIfEmpty, ensureCoaAccount, AKUN_BIAYA_PG } from "@/lib/coa";
import { awardPointsOnPayment } from "@/lib/loyalty";

/**
 * ============================================================================
 *  Pembayaran nota konsumen via DOKU (QRIS / e-wallet / VA)
 * ----------------------------------------------------------------------------
 *  Biaya penanganan (ditanggung laundry): admin % + biaya transfer tetap.
 *  Konsumen membayar penuh (kotor); laundry menerima bersih; selisihnya
 *  dibukukan sebagai beban.
 *
 *  Jurnal pelunasan digital:
 *    Dr 1.1.04 Bank                          (bersih)
 *    Dr 5.3  Beban Biaya Pembayaran Digital  (biaya)
 *      Cr 1.2 Piutang Usaha                  (kotor)
 * ============================================================================
 */

export type PaymentFeeConfig = {
  aktif: boolean;
  persen: number;
  transfer: number;
};

export function hitungFee(
  gross: number,
  persen: number,
  transfer: number,
): { feeAdmin: number; feeTransfer: number; net: number } {
  const feeAdmin = Math.round((gross * persen) / 100);
  const feeTransfer = Math.max(0, Math.floor(transfer));
  const net = Math.max(0, gross - feeAdmin - feeTransfer);
  return { feeAdmin, feeTransfer, net };
}

export async function getPaymentFeeConfig(
  tenantId: string,
): Promise<PaymentFeeConfig> {
  const db = getDb();
  const [t] = await db
    .select({
      aktif: tenants.fiturBayarDigital,
      persen: tenants.biayaAdminPersen,
      transfer: tenants.biayaTransfer,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return {
    aktif: t?.aktif ?? false,
    persen: Number(t?.persen ?? 3.5),
    transfer: t?.transfer ?? 2500,
  };
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
 * Selesaikan sebuah payment order yang SUKSES: tandai lunas, posting jurnal
 * pelunasan (idempoten), dan beri poin loyalitas bila aktif. Aman dipanggil
 * berulang (webhook / cek status manual).
 */
export async function settlePaymentOrder(order: PaymentOrder): Promise<void> {
  if (order.status === "success") return;
  const db = getDb();
  const tenantId = order.tenantId;

  // Ambil transaksi terkait (untuk poin & idempotensi).
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

  const fee = order.feeAdmin + order.feeTransfer;
  const gross = order.amount;
  const net = order.netAmount;

  const alreadyPelunasan = await hasJournal(tenantId, "pelunasan", tx.id);

  // Konfigurasi poin.
  const [t] = await db
    .select({ poinRupiah: tenants.poinRupiah, fiturPoin: tenants.fiturPoin })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  const poinRupiah = t?.poinRupiah ?? 0;
  const berikanPoin =
    !!t?.fiturPoin && poinRupiah > 0 && !!tx.consumerId && Number(tx.grandTotal) > 0;

  await db.transaction(async (trx) => {
    // Tandai order sukses.
    await trx
      .update(paymentOrders)
      .set({ status: "success", paidAt: new Date() })
      .where(eq(paymentOrders.id, order.id));

    // Tandai transaksi lunas.
    await trx
      .update(transactions)
      .set({ statusPembayaran: "lunas", updatedAt: new Date() })
      .where(and(eq(transactions.id, tx.id), eq(transactions.tenantId, tenantId)));

    // Jurnal pelunasan digital (sekali saja).
    if (!alreadyPelunasan && gross > 0) {
      const lines: { kode: string; debit?: number; kredit?: number }[] = [
        { kode: "1.1.04", debit: net }, // Dr Bank (bersih)
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

    // Poin loyalitas (idempoten via ledger).
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
