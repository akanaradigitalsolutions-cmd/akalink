"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import {
  getDb,
  deleteRequests,
  transactions,
  journalEntries,
  employees,
} from "@akalink/db";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";

export type DRResult = { ok: true } | { ok: false; error: string };

async function me(tenantId: string, authUserId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: employees.id, nama: employees.nama })
    .from(employees)
    .where(and(eq(employees.authUserId, authUserId), eq(employees.tenantId, tenantId)))
    .limit(1);
  return row ?? null;
}

/** Staf mengajukan permohonan hapus nota (menunggu persetujuan pemilik). */
export async function requestDeletion(input: {
  transactionId: string;
  alasan: string;
}): Promise<DRResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return { ok: false, error: "Sesi tidak valid." };

  const alasan = String(input.alasan ?? "").trim();
  if (alasan.length < 3)
    return { ok: false, error: "Alasan penghapusan wajib diisi." };

  const db = getDb();
  const [tx] = await db
    .select({ id: transactions.id, noNota: transactions.noNota })
    .from(transactions)
    .where(
      and(eq(transactions.id, input.transactionId), eq(transactions.tenantId, tenantId)),
    )
    .limit(1);
  if (!tx) return { ok: false, error: "Transaksi tidak ditemukan." };

  // Cegah duplikat: sudah ada permintaan pending untuk nota ini.
  const [dup] = await db
    .select({ id: deleteRequests.id })
    .from(deleteRequests)
    .where(
      and(
        eq(deleteRequests.tenantId, tenantId),
        eq(deleteRequests.transactionId, tx.id),
        eq(deleteRequests.status, "pending"),
      ),
    )
    .limit(1);
  if (dup)
    return { ok: false, error: "Sudah ada permintaan hapus yang menunggu persetujuan." };

  const pemohon = await me(tenantId, user.id);
  await db.insert(deleteRequests).values({
    tenantId,
    transactionId: tx.id,
    noNota: tx.noNota,
    alasan,
    status: "pending",
    requestedBy: pemohon?.id ?? null,
    requestedByNama: pemohon?.nama ?? user.email ?? null,
  });

  revalidatePath(`/transaksi/${tx.id}`);
  revalidatePath("/transaksi");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Pemilik menyetujui → nota (dan jurnal terkait) dihapus permanen. */
export async function approveDeletion(requestId: string): Promise<DRResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return { ok: false, error: "Sesi tidak valid." };
  if (getRoleFromUser(user) !== "owner")
    return { ok: false, error: "Hanya pemilik yang dapat menyetujui." };

  const db = getDb();
  const [req] = await db
    .select()
    .from(deleteRequests)
    .where(and(eq(deleteRequests.id, requestId), eq(deleteRequests.tenantId, tenantId)))
    .limit(1);
  if (!req) return { ok: false, error: "Permintaan tidak ditemukan." };
  if (req.status !== "pending")
    return { ok: false, error: "Permintaan sudah diputuskan." };

  const pemutus = await me(tenantId, user.id);

  try {
    await db.transaction(async (trx) => {
      // Hapus nota + jurnal terkait (bila transaksinya masih ada).
      if (req.transactionId) {
        await trx
          .delete(journalEntries)
          .where(
            and(
              eq(journalEntries.tenantId, tenantId),
              eq(journalEntries.refId, req.transactionId),
              inArray(journalEntries.refType, ["transaksi", "pelunasan"]),
            ),
          );
        await trx
          .delete(transactions)
          .where(
            and(
              eq(transactions.id, req.transactionId),
              eq(transactions.tenantId, tenantId),
            ),
          );
      }
      await trx
        .update(deleteRequests)
        .set({
          status: "approved",
          decidedBy: pemutus?.id ?? null,
          decidedByNama: pemutus?.nama ?? user.email ?? null,
          decidedAt: new Date(),
        })
        .where(eq(deleteRequests.id, requestId));
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal menghapus.",
    };
  }

  console.info(
    `[hapus-nota:approve] tenant=${tenantId} nota=${req.noNota} oleh=${user.email} alasan="${req.alasan}"`,
  );
  revalidatePath("/dashboard");
  revalidatePath("/transaksi");
  return { ok: true };
}

/** Pemilik menolak permintaan hapus. */
export async function rejectDeletion(input: {
  requestId: string;
  catatan?: string;
}): Promise<DRResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return { ok: false, error: "Sesi tidak valid." };
  if (getRoleFromUser(user) !== "owner")
    return { ok: false, error: "Hanya pemilik yang dapat menolak." };

  const db = getDb();
  const pemutus = await me(tenantId, user.id);
  const res = await db
    .update(deleteRequests)
    .set({
      status: "rejected",
      catatanKeputusan: input.catatan?.trim() || null,
      decidedBy: pemutus?.id ?? null,
      decidedByNama: pemutus?.nama ?? user.email ?? null,
      decidedAt: new Date(),
    })
    .where(
      and(
        eq(deleteRequests.id, input.requestId),
        eq(deleteRequests.tenantId, tenantId),
        eq(deleteRequests.status, "pending"),
      ),
    )
    .returning({ id: deleteRequests.id });
  if (res.length === 0)
    return { ok: false, error: "Permintaan tidak ditemukan / sudah diputuskan." };

  revalidatePath("/dashboard");
  revalidatePath("/transaksi");
  return { ok: true };
}
