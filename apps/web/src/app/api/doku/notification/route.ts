import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, coinTopupOrders, paymentOrders } from "@akalink/db";
import { verifyNotificationSignature } from "@/lib/doku";
import { topupAppCoin } from "@/lib/app-coin";
import { settlePaymentOrder } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * Webhook notifikasi DOKU.
 * Konfigurasikan URL ini di DOKU Back Office:  https://<domain>/api/doku/notification
 *
 * Alur: verifikasi tanda tangan → cocokkan pesanan lewat invoice_number →
 * bila SUKSES & belum dikreditkan, tambahkan Saldo Koin (idempoten).
 */
export async function POST(req: Request) {
  const rawBody = await req.text();

  const ok = verifyNotificationSignature({
    clientId: req.headers.get("Client-Id"),
    requestId: req.headers.get("Request-Id"),
    timestamp: req.headers.get("Request-Timestamp"),
    signature: req.headers.get("Signature"),
    requestTarget: "/api/doku/notification",
    rawBody,
  });
  if (!ok) {
    return NextResponse.json(
      { error: "Tanda tangan tidak valid." },
      { status: 401 },
    );
  }

  let payload: {
    order?: { invoice_number?: string; amount?: number | string };
    transaction?: { status?: string };
    channel?: { id?: string };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const invoice = payload.order?.invoice_number;
  const status = (payload.transaction?.status ?? "").toUpperCase();
  if (!invoice)
    return NextResponse.json(
      { error: "invoice_number tidak ada." },
      { status: 400 },
    );

  const db = getDb();

  // --- 1) Isi ulang Saldo Koin (coin_topup_orders) ------------------------
  const [coin] = await db
    .select()
    .from(coinTopupOrders)
    .where(eq(coinTopupOrders.invoiceNumber, invoice))
    .limit(1);

  if (coin) {
    if (coin.status === "success")
      return NextResponse.json({ received: true, alreadyProcessed: true });
    if (status !== "SUCCESS") {
      if (status === "FAILED" || status === "EXPIRED") {
        await db
          .update(coinTopupOrders)
          .set({ status: status === "EXPIRED" ? "expired" : "failed" })
          .where(eq(coinTopupOrders.id, coin.id));
      }
      return NextResponse.json({ received: true, status });
    }
    try {
      await db.transaction(async (tx) => {
        await topupAppCoin(tx, coin.tenantId, {
          amount: coin.amount,
          keterangan: `Isi ulang via DOKU (${invoice})`,
          refType: "doku",
          refId: coin.id,
          tipe: "topup",
          createdBy: coin.createdBy ?? null,
        });
        await tx
          .update(coinTopupOrders)
          .set({
            status: "success",
            paidAt: new Date(),
            channel: payload.channel?.id ?? null,
          })
          .where(eq(coinTopupOrders.id, coin.id));
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Gagal memproses." },
        { status: 500 },
      );
    }
    return NextResponse.json({ received: true, status: "SUCCESS", type: "coin" });
  }

  // --- 2) Pembayaran nota konsumen (payment_orders) -----------------------
  const [order] = await db
    .select()
    .from(paymentOrders)
    .where(eq(paymentOrders.invoiceNumber, invoice))
    .limit(1);
  if (!order)
    return NextResponse.json(
      { error: "Pesanan tidak ditemukan." },
      { status: 404 },
    );

  if (order.status === "success")
    return NextResponse.json({ received: true, alreadyProcessed: true });
  if (status !== "SUCCESS") {
    if (status === "FAILED" || status === "EXPIRED") {
      await db
        .update(paymentOrders)
        .set({ status: status === "EXPIRED" ? "expired" : "failed" })
        .where(eq(paymentOrders.id, order.id));
    }
    return NextResponse.json({ received: true, status });
  }

  try {
    if (payload.channel?.id) {
      await db
        .update(paymentOrders)
        .set({ channel: payload.channel.id })
        .where(eq(paymentOrders.id, order.id));
    }
    await settlePaymentOrder({ ...order, channel: payload.channel?.id ?? order.channel });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal memproses." },
      { status: 500 },
    );
  }
  return NextResponse.json({ received: true, status: "SUCCESS", type: "nota" });
}
