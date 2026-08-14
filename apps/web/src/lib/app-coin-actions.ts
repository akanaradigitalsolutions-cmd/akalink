"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, employees } from "@akalink/db";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { topupAppCoin } from "@/lib/app-coin";

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
