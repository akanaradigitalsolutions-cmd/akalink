"use server";

import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb, machines, machineSessions, employees } from "@akalink/db";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getActiveOutlet } from "@/lib/outlets";
import { seedDefaultCoaIfEmpty } from "@/lib/coa";
import { postJournal } from "@/lib/journal";

export type MachineResult = { ok: true } | { ok: false; error: string };

async function ctx() {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return null;
  return { user, tenantId };
}

function genToken(): string {
  return "dev_" + crypto.randomBytes(16).toString("hex");
}

// ---- CRUD mesin (khusus Owner) -------------------------------------------
export async function createMachine(input: {
  nama: string;
  tipe: "mesin_cuci" | "pengering";
  kapasitasKg?: string | number;
  hargaSesi: number | string;
  durasiMenit: number | string;
}): Promise<MachineResult> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sesi tidak valid." };
  if (getRoleFromUser(c.user) !== "owner")
    return { ok: false, error: "Hanya pemilik yang dapat menambah mesin." };

  const nama = String(input.nama ?? "").trim();
  if (nama.length < 1) return { ok: false, error: "Nama mesin wajib diisi." };

  const db = getDb();
  const outlet = await getActiveOutlet(c.tenantId);
  await db.insert(machines).values({
    tenantId: c.tenantId,
    outletId: outlet?.id ?? null,
    nama,
    tipe: input.tipe === "pengering" ? "pengering" : "mesin_cuci",
    kapasitasKg: input.kapasitasKg ? String(input.kapasitasKg) : null,
    hargaSesi: Math.max(0, Math.floor(Number(input.hargaSesi) || 0)),
    durasiMenit: Math.max(1, Math.floor(Number(input.durasiMenit) || 40)),
    deviceToken: genToken(),
  });
  revalidatePath("/mesin");
  return { ok: true };
}

export async function updateMachine(input: {
  id: string;
  nama: string;
  tipe: "mesin_cuci" | "pengering";
  kapasitasKg?: string | number;
  hargaSesi: number | string;
  durasiMenit: number | string;
  status?: "idle" | "maintenance";
}): Promise<MachineResult> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sesi tidak valid." };
  if (getRoleFromUser(c.user) !== "owner")
    return { ok: false, error: "Hanya pemilik yang dapat mengubah mesin." };

  const db = getDb();
  await db
    .update(machines)
    .set({
      nama: String(input.nama ?? "").trim(),
      tipe: input.tipe === "pengering" ? "pengering" : "mesin_cuci",
      kapasitasKg: input.kapasitasKg ? String(input.kapasitasKg) : null,
      hargaSesi: Math.max(0, Math.floor(Number(input.hargaSesi) || 0)),
      durasiMenit: Math.max(1, Math.floor(Number(input.durasiMenit) || 40)),
      ...(input.status ? { status: input.status } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(machines.id, input.id), eq(machines.tenantId, c.tenantId)));
  revalidatePath("/mesin");
  return { ok: true };
}

export async function deleteMachine(id: string): Promise<MachineResult> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sesi tidak valid." };
  if (getRoleFromUser(c.user) !== "owner")
    return { ok: false, error: "Hanya pemilik yang dapat menghapus mesin." };
  const db = getDb();
  await db
    .delete(machines)
    .where(and(eq(machines.id, id), eq(machines.tenantId, c.tenantId)));
  revalidatePath("/mesin");
  return { ok: true };
}

export async function regenerateToken(id: string): Promise<MachineResult> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sesi tidak valid." };
  if (getRoleFromUser(c.user) !== "owner")
    return { ok: false, error: "Hanya pemilik." };
  const db = getDb();
  await db
    .update(machines)
    .set({ deviceToken: genToken(), updatedAt: new Date() })
    .where(and(eq(machines.id, id), eq(machines.tenantId, c.tenantId)));
  revalidatePath("/mesin");
  return { ok: true };
}

// ---- Sesi self-service ---------------------------------------------------
export async function startSession(input: {
  machineId: string;
  durasiMenit?: number | string;
  consumerId?: string | null;
  metodeBayar?: "tunai" | "digital";
}): Promise<MachineResult> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sesi tidak valid." };

  const db = getDb();
  const [m] = await db
    .select()
    .from(machines)
    .where(and(eq(machines.id, input.machineId), eq(machines.tenantId, c.tenantId)))
    .limit(1);
  if (!m) return { ok: false, error: "Mesin tidak ditemukan." };
  if (m.status === "running")
    return { ok: false, error: "Mesin sedang dipakai." };
  if (m.status === "maintenance")
    return { ok: false, error: "Mesin dalam perawatan." };
  if (!m.aktif) return { ok: false, error: "Mesin nonaktif." };

  const durasi = Math.max(1, Math.floor(Number(input.durasiMenit) || m.durasiMenit));
  const biaya = m.hargaSesi;
  const now = new Date();
  const selesaiEstimasi = new Date(now.getTime() + durasi * 60_000);
  const metode = input.metodeBayar === "digital" ? "digital" : "tunai";

  const [me] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(eq(employees.authUserId, c.user.id), eq(employees.tenantId, c.tenantId)))
    .limit(1);

  await seedDefaultCoaIfEmpty(c.tenantId);

  await db.transaction(async (tx) => {
    const [sesi] = await tx
      .insert(machineSessions)
      .values({
        tenantId: c.tenantId,
        machineId: m.id,
        outletId: m.outletId,
        consumerId: input.consumerId ?? null,
        kasirId: me?.id ?? null,
        mulai: now,
        selesaiEstimasi,
        durasiMenit: durasi,
        biaya,
        metodeBayar: metode,
        status: "running",
      })
      .returning({ id: machineSessions.id });

    await tx
      .update(machines)
      .set({ status: "running", updatedAt: now })
      .where(eq(machines.id, m.id));

    // Pembayaran tunai (prabayar) → jurnal pendapatan.
    if (metode === "tunai" && biaya > 0) {
      await postJournal(tx, c.tenantId, {
        keterangan: `Self-service ${m.nama}`,
        refType: "self_service",
        refId: sesi.id,
        lines: [
          { kode: "1.1.02", debit: biaya }, // Dr Kas Outlet
          { kode: "4.1", kredit: biaya }, // Cr Pendapatan Jasa
        ],
      });
    }
  });

  revalidatePath("/mesin");
  return { ok: true };
}

export async function stopSession(machineId: string): Promise<MachineResult> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sesi tidak valid." };
  const db = getDb();
  const [sesi] = await db
    .select({ id: machineSessions.id })
    .from(machineSessions)
    .where(
      and(
        eq(machineSessions.tenantId, c.tenantId),
        eq(machineSessions.machineId, machineId),
        eq(machineSessions.status, "running"),
      ),
    )
    .limit(1);
  if (sesi) {
    await db
      .update(machineSessions)
      .set({ status: "selesai", selesai: new Date() })
      .where(eq(machineSessions.id, sesi.id));
  }
  await db
    .update(machines)
    .set({ status: "idle", updatedAt: new Date() })
    .where(and(eq(machines.id, machineId), eq(machines.tenantId, c.tenantId)));
  revalidatePath("/mesin");
  return { ok: true };
}
