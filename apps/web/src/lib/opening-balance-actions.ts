"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, journalEntries } from "@akalink/db";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { seedDefaultCoaIfEmpty } from "@/lib/coa";
import { postJournal } from "@/lib/journal";
import {
  REF_SALDO_AWAL,
  AKUN_KAS_PERUSAHAAN,
  AKUN_KAS_LAUNDRY,
  AKUN_BANK,
} from "@/lib/opening-balance";

export type OpeningResult = { ok: true } | { ok: false; error: string };

const AKUN_MODAL = "3.1"; // Modal Pemilik

/**
 * Set/ubah saldo awal Kas Perusahaan, Kas Laundry, dan Bank.
 * Membuat SATU entri jurnal saldo awal (mengganti yang lama bila ada):
 *   Dr Kas Besar / Dr Kas Outlet / Dr Bank  ...  Cr Modal Pemilik (total).
 * Ini otomatis tampil di Neraca sebagai Aset & Modal awal.
 */
export async function setOpeningBalance(input: {
  kasPerusahaan: number | string;
  kasLaundry: number | string;
  bank: number | string;
  tanggal?: string;
}): Promise<OpeningResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return { ok: false, error: "Sesi tidak valid." };
  if (getRoleFromUser(user) !== "owner")
    return { ok: false, error: "Hanya pemilik yang dapat mengatur saldo awal." };

  const kasP = Math.max(0, Math.floor(Number(input.kasPerusahaan) || 0));
  const kasL = Math.max(0, Math.floor(Number(input.kasLaundry) || 0));
  const bank = Math.max(0, Math.floor(Number(input.bank) || 0));
  const total = kasP + kasL + bank;

  await seedDefaultCoaIfEmpty(tenantId);
  const db = getDb();
  const tanggal = input.tanggal ? new Date(input.tanggal + "T00:00:00") : new Date();

  try {
    await db.transaction(async (tx) => {
      // Hapus entri saldo awal lama (bila ada) — cascade ke journal_lines.
      await tx
        .delete(journalEntries)
        .where(
          and(
            eq(journalEntries.tenantId, tenantId),
            eq(journalEntries.refType, REF_SALDO_AWAL),
            eq(journalEntries.refId, tenantId),
          ),
        );

      if (total > 0) {
        const lines: { kode: string; debit?: number; kredit?: number }[] = [];
        if (kasP > 0) lines.push({ kode: AKUN_KAS_PERUSAHAAN, debit: kasP });
        if (kasL > 0) lines.push({ kode: AKUN_KAS_LAUNDRY, debit: kasL });
        if (bank > 0) lines.push({ kode: AKUN_BANK, debit: bank });
        lines.push({ kode: AKUN_MODAL, kredit: total }); // Cr Modal Pemilik
        await postJournal(tx, tenantId, {
          tanggal,
          keterangan: "Saldo awal (Kas & Bank)",
          refType: REF_SALDO_AWAL,
          refId: tenantId,
          lines,
        });
      }
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan." };
  }

  revalidatePath("/keuangan/saldo-awal");
  revalidatePath("/keuangan/neraca");
  revalidatePath("/keuangan/buku-besar");
  revalidatePath("/keuangan/jurnal");
  revalidatePath("/kas");
  return { ok: true };
}
