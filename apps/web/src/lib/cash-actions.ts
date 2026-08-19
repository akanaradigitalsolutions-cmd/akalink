"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, cashMovements, employees } from "@akalink/db";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getActiveOutlet } from "@/lib/outlets";
import { seedDefaultCoaIfEmpty } from "@/lib/coa";
import { postJournal } from "@/lib/journal";

export type CashResult = { ok: true } | { ok: false; error: string };

/**
 * Catat pemindahan kas laundry.
 *  - setor_bank : Kas Outlet → Bank      (Dr 1.1.04 / Cr 1.1.02)
 *  - ambil_owner: Kas Outlet → Pemilik   (Dr 3.9 Prive / Cr 1.1.02)
 *  - kas_masuk  : tambahan kas dari pemilik (Dr 1.1.02 / Cr 3.1 Modal)
 */
export async function recordCashMovement(input: {
  tipe: "setor_bank" | "ambil_owner" | "kas_masuk";
  jumlah: number | string;
  tujuan?: string;
  catatan?: string;
}): Promise<CashResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return { ok: false, error: "Sesi tidak valid." };

  const jumlah = Math.floor(Number(input.jumlah) || 0);
  if (jumlah <= 0) return { ok: false, error: "Nominal tidak valid." };
  const tipe =
    input.tipe === "ambil_owner"
      ? "ambil_owner"
      : input.tipe === "kas_masuk"
        ? "kas_masuk"
        : "setor_bank";

  await seedDefaultCoaIfEmpty(tenantId);
  const db = getDb();
  const outlet = await getActiveOutlet(tenantId);
  const [me] = await db
    .select({ id: employees.id, nama: employees.nama })
    .from(employees)
    .where(and(eq(employees.authUserId, user.id), eq(employees.tenantId, tenantId)))
    .limit(1);

  const lines =
    tipe === "setor_bank"
      ? [
          { kode: "1.1.04", debit: jumlah }, // Dr Bank
          { kode: "1.1.02", kredit: jumlah }, // Cr Kas Outlet
        ]
      : tipe === "ambil_owner"
        ? [
            { kode: "3.9", debit: jumlah }, // Dr Prive
            { kode: "1.1.02", kredit: jumlah }, // Cr Kas Outlet
          ]
        : [
            { kode: "1.1.02", debit: jumlah }, // Dr Kas Outlet
            { kode: "3.1", kredit: jumlah }, // Cr Modal Pemilik
          ];

  const ket =
    tipe === "setor_bank"
      ? `Setoran kas ke bank${input.tujuan ? ` (${input.tujuan})` : ""}`
      : tipe === "ambil_owner"
        ? `Kas diserahkan ke pemilik${input.tujuan ? ` (${input.tujuan})` : ""}`
        : `Kas masuk dari pemilik${input.tujuan ? ` (${input.tujuan})` : ""}`;

  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(cashMovements)
        .values({
          tenantId,
          outletId: outlet?.id ?? null,
          tipe,
          jumlah,
          tujuan: input.tujuan?.trim() || null,
          catatan: input.catatan?.trim() || null,
          createdBy: me?.id ?? null,
          createdByNama: me?.nama ?? user.email ?? null,
        })
        .returning({ id: cashMovements.id });
      await postJournal(tx, tenantId, {
        keterangan: ket,
        refType: "kas_movement",
        refId: row.id,
        lines,
      });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal mencatat." };
  }

  revalidatePath("/kas");
  revalidatePath("/dashboard");
  return { ok: true };
}
