"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { getDb, consumers, pointTransactions } from "@akalink/db";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";

export type LoyaltyResult = { ok: true } | { ok: false; error: string };

/** Tukar poin konsumen (kurangi saldo + catat ledger). Kasir & owner. */
export async function redeemPoints(input: {
  consumerId: string;
  poin: number | string;
  keterangan?: string;
}): Promise<LoyaltyResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return { ok: false, error: "Sesi tidak valid." };

  const poin = Math.floor(Number(input.poin));
  if (!(poin > 0)) return { ok: false, error: "Jumlah poin harus lebih dari 0." };

  const db = getDb();
  const [c] = await db
    .select({ poin: consumers.poin })
    .from(consumers)
    .where(
      and(
        eq(consumers.id, input.consumerId),
        eq(consumers.tenantId, tenantId),
      ),
    )
    .limit(1);
  if (!c) return { ok: false, error: "Konsumen tidak ditemukan." };
  if (poin > Number(c.poin))
    return {
      ok: false,
      error: `Poin tidak cukup (tersisa ${Number(c.poin)}).`,
    };

  await db.transaction(async (tx) => {
    await tx.insert(pointTransactions).values({
      tenantId,
      consumerId: input.consumerId,
      tipe: "penukaran",
      delta: String(-poin),
      keterangan: input.keterangan?.trim() || "Tukar poin",
    });
    await tx
      .update(consumers)
      .set({
        poin: sql`${consumers.poin} - ${poin}`,
        updatedAt: new Date(),
      })
      .where(eq(consumers.id, input.consumerId));
  });

  revalidatePath(`/konsumen/${input.consumerId}`);
  return { ok: true };
}
