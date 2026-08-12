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
  journalEntries,
} from "@akalink/db";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { seedDefaultCoaIfEmpty } from "@/lib/coa";
import { postJournal, hasJournal } from "@/lib/journal";

const WORK_STATUSES = ["belum_dikerjakan", "proses", "selesai", "diambil"] as const;
const PAY_STATUSES = ["belum_dibayar", "dp", "lunas"] as const;

async function requireTenant() {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  return user && tenantId ? tenantId : null;
}

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

  // Pastikan COA tersedia sebelum memposting jurnal.
  await seedDefaultCoaIfEmpty(tenantId);

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

    // Jurnal penjualan: Dr Piutang (+ Dr Diskon) / Cr Pendapatan.
    const jLines: { kode: string; debit?: number; kredit?: number }[] = [
      { kode: "1.2", debit: grandTotal },
    ];
    if (diskon > 0) jLines.push({ kode: "4.9", debit: diskon });
    jLines.push({ kode: "4.1", kredit: subtotal + biayaExpress });
    await postJournal(tx, tenantId, {
      keterangan: `Transaksi ${noNota}`,
      refType: "transaksi",
      refId: row.id,
      lines: jLines,
    });

    return row.id;
  });

  revalidatePath("/transaksi");
  return { ok: true, id: txId, noNota };
}

// ---- Edit transaksi (khusus Owner, selama belum lunas) -------------------
const updateSchema = inputSchema.extend({ id: z.string().uuid() });

export async function updateTransaction(
  input: unknown,
): Promise<CreateTxResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId)
    return { ok: false, error: "Sesi tidak valid. Silakan masuk lagi." };
  if (getRoleFromUser(user) !== "owner")
    return {
      ok: false,
      error: "Hanya pemilik (Owner) yang dapat mengedit transaksi.",
    };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Data transaksi tidak valid." };
  const d = parsed.data;

  const db = getDb();

  const [existing] = await db
    .select({
      noNota: transactions.noNota,
      statusPembayaran: transactions.statusPembayaran,
    })
    .from(transactions)
    .where(and(eq(transactions.id, d.id), eq(transactions.tenantId, tenantId)))
    .limit(1);
  if (!existing) return { ok: false, error: "Transaksi tidak ditemukan." };
  if (existing.statusPembayaran === "lunas")
    return {
      ok: false,
      error:
        "Transaksi sudah lunas tidak bisa diedit. Ubah status pembayaran ke belum lunas dulu.",
    };

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

  await seedDefaultCoaIfEmpty(tenantId);

  await db.transaction(async (tx) => {
    await tx
      .update(transactions)
      .set({
        consumerId: d.consumerId ?? null,
        estimasiSelesai,
        isExpress: !!d.isExpress,
        catatan: d.catatan ?? null,
        subtotal: String(subtotal),
        diskon: String(diskon),
        biayaExpress: String(biayaExpress),
        grandTotal: String(grandTotal),
        updatedAt: new Date(),
      })
      .where(
        and(eq(transactions.id, d.id), eq(transactions.tenantId, tenantId)),
      );

    // Ganti seluruh item.
    await tx
      .delete(transactionItems)
      .where(
        and(
          eq(transactionItems.transactionId, d.id),
          eq(transactionItems.tenantId, tenantId),
        ),
      );
    await tx.insert(transactionItems).values(
      itemsToInsert.map((i) => ({
        ...i,
        tenantId,
        transactionId: d.id,
      })),
    );

    // Susun ulang jurnal penjualan (hapus lama, posting baru).
    // Aman: transaksi belum lunas, jadi tidak ada jurnal pelunasan.
    await tx
      .delete(journalEntries)
      .where(
        and(
          eq(journalEntries.tenantId, tenantId),
          eq(journalEntries.refType, "transaksi"),
          eq(journalEntries.refId, d.id),
        ),
      );

    const jLines: { kode: string; debit?: number; kredit?: number }[] = [
      { kode: "1.2", debit: grandTotal },
    ];
    if (diskon > 0) jLines.push({ kode: "4.9", debit: diskon });
    jLines.push({ kode: "4.1", kredit: subtotal + biayaExpress });
    await postJournal(tx, tenantId, {
      keterangan: `Transaksi ${existing.noNota}`,
      refType: "transaksi",
      refId: d.id,
      lines: jLines,
    });
  });

  revalidatePath(`/transaksi/${d.id}`);
  revalidatePath("/transaksi");
  revalidatePath("/keuangan/jurnal");
  revalidatePath("/keuangan/buku-besar");
  revalidatePath("/keuangan/laba-rugi");
  revalidatePath("/keuangan/neraca");
  return { ok: true, id: d.id, noNota: existing.noNota };
}

// ---- Ubah status pengerjaan / pembayaran / item (Phase 1.4) --------------
export type UpdateStatusResult = { ok: true } | { ok: false; error: string };

export async function updateStatuses(input: {
  id: string;
  statusPekerjaan: string;
  statusPembayaran: string;
}): Promise<UpdateStatusResult> {
  const tenantId = await requireTenant();
  if (!tenantId) return { ok: false, error: "Sesi tidak valid." };

  const work = input.statusPekerjaan;
  const pay = input.statusPembayaran;
  if (
    !WORK_STATUSES.includes(work as (typeof WORK_STATUSES)[number]) ||
    !PAY_STATUSES.includes(pay as (typeof PAY_STATUSES)[number])
  ) {
    return { ok: false, error: "Status tidak valid." };
  }

  const db = getDb();

  const [txRow] = await db
    .select({
      subtotal: transactions.subtotal,
      diskon: transactions.diskon,
      biayaExpress: transactions.biayaExpress,
      grandTotal: transactions.grandTotal,
      noNota: transactions.noNota,
    })
    .from(transactions)
    .where(and(eq(transactions.id, input.id), eq(transactions.tenantId, tenantId)))
    .limit(1);
  if (!txRow) return { ok: false, error: "Transaksi tidak ditemukan." };

  await db
    .update(transactions)
    .set({
      statusPekerjaan: work as (typeof WORK_STATUSES)[number],
      statusPembayaran: pay as (typeof PAY_STATUSES)[number],
      updatedAt: new Date(),
    })
    .where(
      and(eq(transactions.id, input.id), eq(transactions.tenantId, tenantId)),
    );

  // Pastikan jurnal lengkap (self-heal untuk transaksi lama pra-engine).
  await seedDefaultCoaIfEmpty(tenantId);
  const grand = Number(txRow.grandTotal);
  const diskonN = Number(txRow.diskon);
  const subtotalN = Number(txRow.subtotal);
  const expressN = Number(txRow.biayaExpress);

  // Jurnal penjualan (bila belum ada).
  if (grand > 0 && !(await hasJournal(tenantId, "transaksi", input.id))) {
    const lines: { kode: string; debit?: number; kredit?: number }[] = [
      { kode: "1.2", debit: grand },
    ];
    if (diskonN > 0) lines.push({ kode: "4.9", debit: diskonN });
    lines.push({ kode: "4.1", kredit: subtotalN + expressN });
    await db.transaction(async (tx) => {
      await postJournal(tx, tenantId, {
        keterangan: `Transaksi ${txRow.noNota}`,
        refType: "transaksi",
        refId: input.id,
        lines,
      });
    });
  }

  // Jurnal pelunasan (sekali saja) saat status menjadi Lunas.
  if (
    pay === "lunas" &&
    grand > 0 &&
    !(await hasJournal(tenantId, "pelunasan", input.id))
  ) {
    await db.transaction(async (tx) => {
      await postJournal(tx, tenantId, {
        keterangan: `Pelunasan ${txRow.noNota}`,
        refType: "pelunasan",
        refId: input.id,
        lines: [
          { kode: "1.1.02", debit: grand }, // Dr Kas Outlet
          { kode: "1.2", kredit: grand }, // Cr Piutang Usaha
        ],
      });
    });
  }

  revalidatePath(`/transaksi/${input.id}`);
  revalidatePath("/transaksi");
  return { ok: true };
}

// ---- Hapus nota (khusus Owner + konfirmasi) ------------------------------
export type DeleteTxResult = { ok: true } | { ok: false; error: string };

export async function deleteTransaction(
  id: string,
): Promise<DeleteTxResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return { ok: false, error: "Sesi tidak valid." };
  if (getRoleFromUser(user) !== "owner")
    return {
      ok: false,
      error: "Hanya pemilik (Owner) yang dapat menghapus nota.",
    };

  const db = getDb();
  const [tx] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)))
    .limit(1);
  if (!tx) return { ok: false, error: "Transaksi tidak ditemukan." };

  try {
    await db.transaction(async (trx) => {
      // Hapus jurnal penjualan & pelunasan terkait.
      // Baris jurnal (journal_lines) ikut terhapus lewat cascade.
      await trx
        .delete(journalEntries)
        .where(
          and(
            eq(journalEntries.tenantId, tenantId),
            eq(journalEntries.refId, id),
            inArray(journalEntries.refType, ["transaksi", "pelunasan"]),
          ),
        );
      // Hapus transaksi. Item transaksi ikut terhapus lewat cascade.
      await trx
        .delete(transactions)
        .where(
          and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)),
        );
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal menghapus nota.",
    };
  }

  revalidatePath("/transaksi");
  revalidatePath("/keuangan/jurnal");
  revalidatePath("/keuangan/buku-besar");
  revalidatePath("/keuangan/laba-rugi");
  revalidatePath("/keuangan/neraca");
  return { ok: true };
}

export async function toggleItemStatus(formData: FormData) {
  const tenantId = await requireTenant();
  if (!tenantId) return;
  const itemId = String(formData.get("itemId"));
  const txId = String(formData.get("txId"));
  const next =
    formData.get("current") === "selesai" ? "belum_dikerjakan" : "selesai";

  const db = getDb();
  await db
    .update(transactionItems)
    .set({ status: next })
    .where(
      and(
        eq(transactionItems.id, itemId),
        eq(transactionItems.tenantId, tenantId),
      ),
    );

  revalidatePath(`/transaksi/${txId}`);
}
