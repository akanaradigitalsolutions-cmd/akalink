"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getDb, employees, coinTopupOrders } from "@akalink/db";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { topupAppCoin } from "@/lib/app-coin";
import { isDokuConfigured, createCheckoutPayment } from "@/lib/doku";

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export type TopupResult =
  | { ok: true; saldoSesudah: number }
  | { ok: false; error: string };

/**
 * Isi ulang Saldo Koin (manual). Untuk sementara ini adalah top-up manual
 * oleh pemilik (mis. simulasi / pencatatan pembayaran manual). Pada tahap
 * berikutnya, top-up otomatis lewat DOKU akan memakai helper yang sama.
 */
export async function topupManual(input: {
  amount: number | string;
  keterangan?: string;
}): Promise<TopupResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId)
    return { ok: false, error: "Sesi tidak valid. Silakan masuk lagi." };
  if (getRoleFromUser(user) !== "owner")
    return { ok: false, error: "Hanya pemilik yang dapat mengisi saldo." };

  const amount = Math.floor(Number(input.amount) || 0);
  if (amount <= 0)
    return { ok: false, error: "Nominal isi ulang tidak valid." };
  if (amount > 100_000_000)
    return { ok: false, error: "Nominal terlalu besar." };

  const db = getDb();
  const [me] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(
      and(eq(employees.authUserId, user.id), eq(employees.tenantId, tenantId)),
    )
    .limit(1);

  try {
    const res = await db.transaction(async (tx) =>
      topupAppCoin(tx, tenantId, {
        amount,
        keterangan: input.keterangan?.trim() || "Isi ulang saldo (manual)",
        refType: "manual",
        tipe: "topup",
        createdBy: me?.id ?? null,
      }),
    );
    revalidatePath("/tagihan");
    revalidatePath("/dashboard");
    return { ok: true, saldoSesudah: res.saldoSesudah };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal mengisi saldo.",
    };
  }
}

export type DokuTopupResult =
  | { ok: true; url: string }
  | { ok: false; error: string; notConfigured?: boolean };

/**
 * Isi ulang Saldo Koin lewat DOKU (QRIS / VA / e-wallet). Membuat pesanan
 * `pending`, memanggil DOKU Checkout, lalu mengembalikan URL pembayaran.
 * Saldo baru ditambahkan setelah notifikasi SUKSES dari DOKU (webhook).
 */
export async function createDokuTopup(input: {
  amount: number | string;
}): Promise<DokuTopupResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId)
    return { ok: false, error: "Sesi tidak valid. Silakan masuk lagi." };
  if (getRoleFromUser(user) !== "owner")
    return { ok: false, error: "Hanya pemilik yang dapat mengisi saldo." };

  if (!isDokuConfigured())
    return {
      ok: false,
      notConfigured: true,
      error:
        "Pembayaran DOKU belum aktif. Hubungi admin untuk mengaktifkan (kredensial DOKU).",
    };

  const amount = Math.floor(Number(input.amount) || 0);
  if (amount < 10_000)
    return { ok: false, error: "Minimal isi ulang Rp10.000." };
  if (amount > 100_000_000)
    return { ok: false, error: "Nominal terlalu besar." };

  const db = getDb();
  const [me] = await db
    .select({ id: employees.id, nama: employees.nama, email: employees.email })
    .from(employees)
    .where(
      and(eq(employees.authUserId, user.id), eq(employees.tenantId, tenantId)),
    )
    .limit(1);

  const invoiceNumber = `KOIN-${Date.now()}-${Math.floor(
    Math.random() * 10000,
  )
    .toString()
    .padStart(4, "0")}`;

  const [order] = await db
    .insert(coinTopupOrders)
    .values({
      tenantId,
      invoiceNumber,
      amount,
      status: "pending",
      createdBy: me?.id ?? null,
    })
    .returning({ id: coinTopupOrders.id });

  try {
    const base = await baseUrl();
    const pay = await createCheckoutPayment({
      invoiceNumber,
      amount,
      callbackUrl: `${base}/tagihan?doku=selesai`,
      customer: {
        name: me?.nama ?? undefined,
        email: me?.email ?? user.email ?? undefined,
      },
      lineItemName: "Isi Ulang Saldo AkaLink",
    });

    await db
      .update(coinTopupOrders)
      .set({ dokuTokenId: pay.tokenId, paymentUrl: pay.url })
      .where(eq(coinTopupOrders.id, order.id));

    return { ok: true, url: pay.url };
  } catch (e) {
    await db
      .update(coinTopupOrders)
      .set({ status: "failed" })
      .where(eq(coinTopupOrders.id, order.id));
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal membuat pembayaran DOKU.",
    };
  }
}
