"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import {
  getDb,
  paymentOrders,
  transactions,
  consumers,
  employees,
} from "@akalink/db";
import {
  getSessionUser,
  getTenantIdFromUser,
} from "@/lib/auth";
import {
  isDokuConfigured,
  createCheckoutPayment,
  checkOrderStatus,
} from "@/lib/doku";
import {
  getPaymentFeeConfig,
  hitungFee,
  settlePaymentOrder,
} from "@/lib/payments";

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export type CreatePaymentResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Buat pembayaran DOKU untuk sebuah nota (QRIS/e-wallet/VA). */
export async function createTransactionPayment(input: {
  transactionId: string;
}): Promise<CreatePaymentResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId)
    return { ok: false, error: "Sesi tidak valid. Silakan masuk lagi." };

  const fee = await getPaymentFeeConfig(tenantId);
  if (!fee.aktif)
    return {
      ok: false,
      error: "Pembayaran digital belum diaktifkan (Pengaturan).",
    };
  if (!isDokuConfigured())
    return { ok: false, error: "DOKU belum dikonfigurasi." };

  const db = getDb();
  const [tx] = await db
    .select({
      id: transactions.id,
      noNota: transactions.noNota,
      grandTotal: transactions.grandTotal,
      statusPembayaran: transactions.statusPembayaran,
      outletId: transactions.outletId,
      consumerId: transactions.consumerId,
    })
    .from(transactions)
    .where(and(eq(transactions.id, input.transactionId), eq(transactions.tenantId, tenantId)))
    .limit(1);
  if (!tx) return { ok: false, error: "Transaksi tidak ditemukan." };
  if (tx.statusPembayaran === "lunas")
    return { ok: false, error: "Transaksi sudah lunas." };

  const gross = Math.round(Number(tx.grandTotal));
  if (gross <= 0) return { ok: false, error: "Nominal transaksi tidak valid." };

  // Reuse pesanan pending yang masih ada bila ada.
  const [pending] = await db
    .select({ id: paymentOrders.id, paymentUrl: paymentOrders.paymentUrl })
    .from(paymentOrders)
    .where(
      and(
        eq(paymentOrders.transactionId, tx.id),
        eq(paymentOrders.status, "pending"),
      ),
    )
    .orderBy(desc(paymentOrders.createdAt))
    .limit(1);
  if (pending?.paymentUrl) return { ok: true, url: pending.paymentUrl };

  const { feeAdmin, net } = hitungFee(gross);

  const [me] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(eq(employees.authUserId, user.id), eq(employees.tenantId, tenantId)))
    .limit(1);

  let konsumenNama: string | undefined;
  if (tx.consumerId) {
    const [c] = await db
      .select({ nama: consumers.nama })
      .from(consumers)
      .where(eq(consumers.id, tx.consumerId))
      .limit(1);
    konsumenNama = c?.nama ?? undefined;
  }

  const invoiceNumber = `TRX-${Date.now()}-${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")}`;

  const [order] = await db
    .insert(paymentOrders)
    .values({
      tenantId,
      transactionId: tx.id,
      outletId: tx.outletId ?? null,
      invoiceNumber,
      amount: gross,
      feeAdmin,
      feeTransfer: 0,
      netAmount: net,
      status: "pending",
      createdBy: me?.id ?? null,
    })
    .returning({ id: paymentOrders.id });

  try {
    const base = await baseUrl();
    const pay = await createCheckoutPayment({
      invoiceNumber,
      amount: gross,
      callbackUrl: `${base}/transaksi/${tx.id}?doku=selesai`,
      customer: konsumenNama ? { name: konsumenNama } : undefined,
      lineItemName: `Pembayaran nota ${tx.noNota}`,
    });
    await db
      .update(paymentOrders)
      .set({ dokuTokenId: pay.tokenId, paymentUrl: pay.url })
      .where(eq(paymentOrders.id, order.id));
    revalidatePath(`/transaksi/${tx.id}`);
    return { ok: true, url: pay.url };
  } catch (e) {
    await db
      .update(paymentOrders)
      .set({ status: "failed" })
      .where(eq(paymentOrders.id, order.id));
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal membuat pembayaran DOKU.",
    };
  }
}

export type CheckPaymentResult =
  | { ok: true; status: "success" | "pending" | "failed" | "none" }
  | { ok: false; error: string };

/** Cek status pembayaran DOKU untuk sebuah nota; lunasi bila sudah dibayar. */
export async function checkTransactionPayment(input: {
  transactionId: string;
}): Promise<CheckPaymentResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId)
    return { ok: false, error: "Sesi tidak valid." };
  if (!isDokuConfigured())
    return { ok: false, error: "DOKU belum dikonfigurasi." };

  const db = getDb();
  const [order] = await db
    .select()
    .from(paymentOrders)
    .where(
      and(
        eq(paymentOrders.transactionId, input.transactionId),
        eq(paymentOrders.tenantId, tenantId),
        eq(paymentOrders.status, "pending"),
      ),
    )
    .orderBy(desc(paymentOrders.createdAt))
    .limit(1);
  if (!order) return { ok: true, status: "none" };

  let status;
  try {
    status = await checkOrderStatus(order.invoiceNumber);
  } catch {
    return { ok: true, status: "pending" };
  }

  if (status === "SUCCESS") {
    await settlePaymentOrder(order);
    revalidatePath(`/transaksi/${input.transactionId}`);
    return { ok: true, status: "success" };
  }
  if (status === "FAILED" || status === "EXPIRED") {
    await db
      .update(paymentOrders)
      .set({ status: status === "EXPIRED" ? "expired" : "failed" })
      .where(eq(paymentOrders.id, order.id));
    return { ok: true, status: "failed" };
  }
  return { ok: true, status: "pending" };
}
