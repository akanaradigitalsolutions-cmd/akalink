"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import {
  getDb,
  investors,
  investments,
  investorPayouts,
  employees,
} from "@akalink/db";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { seedDefaultCoaIfEmpty, ensureCoaAccount, AKUN_MODAL_INVESTOR, AKUN_DISTRIBUSI_BAGI_HASIL } from "@/lib/coa";
import { postJournal } from "@/lib/journal";
import { getLabaPeriode, computeShares, type ShareRow } from "@/lib/investors";

export type InvestorResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

type Ctx =
  | { ok: false; err: string }
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>; tenantId: string };

async function ownerCtx(): Promise<Ctx> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return { ok: false, err: "Sesi tidak valid." };
  if (getRoleFromUser(user) !== "owner")
    return { ok: false, err: "Hanya pemilik yang dapat mengelola investor." };
  return { ok: true, user, tenantId };
}

async function myEmployeeId(tenantId: string, authUserId: string) {
  const db = getDb();
  const [me] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(eq(employees.authUserId, authUserId), eq(employees.tenantId, tenantId)))
    .limit(1);
  return me?.id ?? null;
}

// ---- Hitung bagi hasil (laba periode + bagian tiap investor) ------------
export type HitungResult =
  | { ok: true; laba: number; pendapatan: number; beban: number; shares: ShareRow[] }
  | { ok: false; error: string };

export async function hitungBagiHasil(input: {
  periodeAwal?: string;
  periodeAkhir?: string;
}): Promise<HitungResult> {
  const c = await ownerCtx();
  if (!c.ok) return { ok: false, error: c.err };
  const { laba, pendapatan, beban } = await getLabaPeriode(
    c.tenantId,
    input.periodeAwal,
    input.periodeAkhir,
  );
  const shares = await computeShares(c.tenantId, laba);
  return { ok: true, laba, pendapatan, beban, shares };
}

// ---- Investor ------------------------------------------------------------
export async function createInvestor(input: {
  nama: string;
  telepon?: string;
  email?: string;
  catatan?: string;
}): Promise<InvestorResult> {
  const c = await ownerCtx();
  if (!c.ok) return { ok: false, error: c.err };
  const nama = String(input.nama ?? "").trim();
  if (nama.length < 2) return { ok: false, error: "Nama investor wajib diisi." };
  const db = getDb();
  const [row] = await db
    .insert(investors)
    .values({
      tenantId: c.tenantId,
      nama,
      telepon: input.telepon?.trim() || null,
      email: input.email?.trim() || null,
      catatan: input.catatan?.trim() || null,
    })
    .returning({ id: investors.id });
  revalidatePath("/investor");
  return { ok: true, id: row.id };
}

export async function updateInvestor(input: {
  id: string;
  nama: string;
  telepon?: string;
  email?: string;
  catatan?: string;
  aktif?: boolean;
}): Promise<InvestorResult> {
  const c = await ownerCtx();
  if (!c.ok) return { ok: false, error: c.err };
  const db = getDb();
  await db
    .update(investors)
    .set({
      nama: String(input.nama ?? "").trim(),
      telepon: input.telepon?.trim() || null,
      email: input.email?.trim() || null,
      catatan: input.catatan?.trim() || null,
      aktif: input.aktif ?? true,
    })
    .where(and(eq(investors.id, input.id), eq(investors.tenantId, c.tenantId)));
  revalidatePath("/investor");
  revalidatePath(`/investor/${input.id}`);
  return { ok: true };
}

export async function deleteInvestor(id: string): Promise<InvestorResult> {
  const c = await ownerCtx();
  if (!c.ok) return { ok: false, error: c.err };
  const db = getDb();
  await db
    .delete(investors)
    .where(and(eq(investors.id, id), eq(investors.tenantId, c.tenantId)));
  revalidatePath("/investor");
  return { ok: true };
}

// ---- Investasi (setoran modal) ------------------------------------------
export async function addInvestment(input: {
  investorId: string;
  modal: number | string;
  persenBagiHasil: number | string;
  tanggalMulai?: string;
  akun?: "1.1.02" | "1.1.04";
}): Promise<InvestorResult> {
  const c = await ownerCtx();
  if (!c.ok) return { ok: false, error: c.err };

  const modal = Math.max(0, Math.floor(Number(input.modal) || 0));
  const persen = Math.min(100, Math.max(0, Number(input.persenBagiHasil) || 0));
  const akun = input.akun === "1.1.02" ? "1.1.02" : "1.1.04";

  await seedDefaultCoaIfEmpty(c.tenantId);
  await ensureCoaAccount(c.tenantId, AKUN_MODAL_INVESTOR);

  const db = getDb();
  const meId = await myEmployeeId(c.tenantId, c.user.id);

  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(investments)
      .values({
        tenantId: c.tenantId,
        investorId: input.investorId,
        modal,
        persenBagiHasil: String(persen),
        tanggalMulai: input.tanggalMulai || null,
      })
      .returning({ id: investments.id });

    // Setoran modal masuk kas/bank.
    if (modal > 0) {
      await postJournal(tx, c.tenantId, {
        keterangan: `Setoran modal investor`,
        refType: "modal_investor",
        refId: row.id,
        lines: [
          { kode: akun, debit: modal }, // Dr Kas/Bank
          { kode: AKUN_MODAL_INVESTOR, kredit: modal }, // Cr Modal Investor
        ],
      });
    }
  });

  void meId;
  revalidatePath(`/investor/${input.investorId}`);
  revalidatePath("/investor");
  return { ok: true };
}

// ---- Bayar bagi hasil ----------------------------------------------------
export async function recordPayout(input: {
  investorId: string;
  jumlah: number | string;
  labaPeriode?: number | string;
  persen?: number | string;
  periodeAwal?: string;
  periodeAkhir?: string;
  akun?: "1.1.02" | "1.1.04";
}): Promise<InvestorResult> {
  const c = await ownerCtx();
  if (!c.ok) return { ok: false, error: c.err };

  const jumlah = Math.max(0, Math.floor(Number(input.jumlah) || 0));
  if (jumlah <= 0) return { ok: false, error: "Nominal bagi hasil tidak valid." };
  const akun = input.akun === "1.1.02" ? "1.1.02" : "1.1.04";

  await seedDefaultCoaIfEmpty(c.tenantId);
  await ensureCoaAccount(c.tenantId, AKUN_DISTRIBUSI_BAGI_HASIL);

  const db = getDb();
  const meId = await myEmployeeId(c.tenantId, c.user.id);

  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(investorPayouts)
      .values({
        tenantId: c.tenantId,
        investorId: input.investorId,
        periodeAwal: input.periodeAwal || null,
        periodeAkhir: input.periodeAkhir || null,
        labaPeriode: Math.max(0, Math.floor(Number(input.labaPeriode) || 0)),
        persen: String(Number(input.persen) || 0),
        jumlah,
        createdBy: meId,
      })
      .returning({ id: investorPayouts.id });

    await postJournal(tx, c.tenantId, {
      keterangan: `Bagi hasil investor`,
      refType: "bagi_hasil",
      refId: row.id,
      lines: [
        { kode: AKUN_DISTRIBUSI_BAGI_HASIL, debit: jumlah }, // Dr Distribusi Bagi Hasil
        { kode: akun, kredit: jumlah }, // Cr Kas/Bank
      ],
    });
  });

  revalidatePath(`/investor/${input.investorId}`);
  revalidatePath("/investor");
  return { ok: true };
}
