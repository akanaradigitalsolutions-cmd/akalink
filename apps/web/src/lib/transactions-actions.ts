"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  getDb,
  transactions,
  transactionItems,
  services,
  employees,
} from "@akalink/db";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";

export type CreateTxResult =
  | { ok: true; id: string; noNota: string }
  | { ok: false; error: string };

const inputSchema = z.object({
  consumerId: z.string().uuid().nullable().optional(),
  items: z
    .array(
      z.object({
        serviceId: z.string().uuid(),
        qty: z.coerce.number().positive(),
      }),
    )
    .min(1),
  isExpress: z.boolean().optional(),
  biayaExpress: z.coerce.number().min(0).optional(),
  diskon: z.coerce.number().min(0).optional(),
  catatan: z.string().trim().optional(),
});

/** Nomor nota unik: AKA + YYMMDDHHMMSS + 3 digit acak. */
function genNota(): string {
  const n = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  const ts =
    String(n.getFullYear()).slice(2) +
    p(n.getMonth() + 1) +
    p(n.getDate()) +
    p(n.getHours()) +
    p(n.getMinutes()) +
    p(n.getSeconds());
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `AKA${ts}${rand}`;
}

export async function createTransaction(
  input: unknown,
): Promise<CreateTxResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId)
    return { ok: false, error: "Sesi tidak valid. Silakan masuk lagi." };

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Data transaksi tidak valid." };
  const d = parsed.data;

  const db = getDb();

  // Ambil layanan otoritatif dari DB (jangan percaya harga dari klien).
  const ids = [...new Set(d.items.map((i) => i.serviceId))];
  const svcRows = await db
    .select()
    .from(services)
    .where(and(eq(services.tenantId, tenantId), inArray(services.id, ids)));
  const svcMap = new Map(svcRows.map((s) => [s.id, s]));

  let subtotal = 0;
  let maxEstMs = 0;
  const itemsToInsert: {
    serviceId: string;
    namaLayanan: string;
    tipeSatuan: string;
    qty: string;
    harga: string;
    subtotal: string;
  }[] = [];

  for (const it of d.items) {
    const s = svcMap.get(it.serviceId);
    if (!s) continue;
    const harga = Number(s.harga);
    const sub = harga * it.qty;
    subtotal += sub;
    const estMs =
      (s.estimasiNilai ?? 0) *
      (s.estimasiSatuan === "hari" ? 86_400_000 : 3_600_000);
    if (estMs > maxEstMs) maxEstMs = estMs;
    itemsToInsert.push({
      serviceId: s.id,
      namaLayanan: s.nama,
      tipeSatuan: s.tipeSatuan,
      qty: String(it.qty),
      harga: String(harga),
      subtotal: String(sub),
    });
  }

  if (itemsToInsert.length === 0)
    return { ok: false, error: "Tidak ada layanan valid pada transaksi." };

  const biayaExpress = d.isExpress ? (d.biayaExpress ?? 0) : 0;
  const diskon = d.diskon ?? 0;
  const grandTotal = Math.max(0, subtotal + biayaExpress - diskon);
  const estimasiSelesai =
    maxEstMs > 0 ? new Date(Date.now() + maxEstMs) : null;

  const [me] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(
      and(eq(employees.authUserId, user.id), eq(employees.tenantId, tenantId)),
    )
    .limit(1);

  const noNota = genNota();

  const txId = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(transactions)
      .values({
        tenantId,
        noNota,
        consumerId: d.consumerId ?? null,
        kasirId: me?.id ?? null,
        estimasiSelesai,
        isExpress: !!d.isExpress,
        catatan: d.catatan ?? null,
        subtotal: String(subtotal),
        diskon: String(diskon),
        biayaExpress: String(biayaExpress),
        grandTotal: String(grandTotal),
      })
      .returning({ id: transactions.id });

    await tx.insert(transactionItems).values(
      itemsToInsert.map((i) => ({
        ...i,
        tenantId,
        transactionId: row.id,
      })),
    );
    return row.id;
  });

  revalidatePath("/transaksi");
  return { ok: true, id: txId, noNota };
}
