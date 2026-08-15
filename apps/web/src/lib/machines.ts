import "server-only";

import { and, desc, eq, inArray, lt } from "drizzle-orm";
import {
  getDb,
  machines,
  machineSessions,
  consumers,
} from "@akalink/db";

export type MachineView = {
  id: string;
  nama: string;
  tipe: "mesin_cuci" | "pengering";
  kapasitasKg: string | null;
  hargaSesi: number;
  durasiMenit: number;
  status: "idle" | "running" | "maintenance";
  online: boolean;
  aktif: boolean;
  deviceToken: string;
  // Sesi berjalan (bila ada).
  sesi?: {
    id: string;
    konsumen: string | null;
    mulai: string;
    selesaiEstimasi: string;
    sisaDetik: number;
    biaya: number;
  } | null;
};

// Perangkat dianggap online bila melapor < 90 detik terakhir.
const ONLINE_WINDOW_MS = 90_000;

/**
 * Selesaikan otomatis sesi yang sudah lewat waktu (karena tidak ada worker
 * latar). Dipanggil saat halaman/route dibaca.
 */
export async function finalizeExpiredSessions(tenantId: string) {
  const db = getDb();
  const expired = await db
    .select({ id: machineSessions.id, machineId: machineSessions.machineId, est: machineSessions.selesaiEstimasi })
    .from(machineSessions)
    .where(
      and(
        eq(machineSessions.tenantId, tenantId),
        eq(machineSessions.status, "running"),
        lt(machineSessions.selesaiEstimasi, new Date()),
      ),
    );
  if (expired.length === 0) return;
  for (const s of expired) {
    await db
      .update(machineSessions)
      .set({ status: "selesai", selesai: s.est })
      .where(eq(machineSessions.id, s.id));
    await db
      .update(machines)
      .set({ status: "idle", updatedAt: new Date() })
      .where(and(eq(machines.id, s.machineId), eq(machines.tenantId, tenantId)));
  }
}

export async function getMachines(
  tenantId: string,
  outletId?: string,
): Promise<MachineView[]> {
  const db = getDb();
  await finalizeExpiredSessions(tenantId);

  const rows = await db
    .select()
    .from(machines)
    .where(
      outletId
        ? and(eq(machines.tenantId, tenantId), eq(machines.outletId, outletId))
        : eq(machines.tenantId, tenantId),
    )
    .orderBy(machines.nama);
  if (rows.length === 0) return [];

  // Sesi berjalan untuk mesin-mesin ini.
  const ids = rows.map((m) => m.id);
  const running = await db
    .select({
      id: machineSessions.id,
      machineId: machineSessions.machineId,
      mulai: machineSessions.mulai,
      selesaiEstimasi: machineSessions.selesaiEstimasi,
      biaya: machineSessions.biaya,
      konsumen: consumers.nama,
    })
    .from(machineSessions)
    .leftJoin(consumers, eq(machineSessions.consumerId, consumers.id))
    .where(
      and(
        eq(machineSessions.tenantId, tenantId),
        eq(machineSessions.status, "running"),
        inArray(machineSessions.machineId, ids),
      ),
    );
  const byMachine = new Map(running.map((r) => [r.machineId, r]));

  const now = Date.now();
  return rows.map((m) => {
    const s = byMachine.get(m.id);
    return {
      id: m.id,
      nama: m.nama,
      tipe: m.tipe,
      kapasitasKg: m.kapasitasKg,
      hargaSesi: m.hargaSesi,
      durasiMenit: m.durasiMenit,
      status: m.status,
      online: m.lastSeenAt ? now - m.lastSeenAt.getTime() < ONLINE_WINDOW_MS : false,
      aktif: m.aktif,
      deviceToken: m.deviceToken,
      sesi: s
        ? {
            id: s.id,
            konsumen: s.konsumen,
            mulai: s.mulai.toISOString(),
            selesaiEstimasi: s.selesaiEstimasi.toISOString(),
            sisaDetik: Math.max(
              0,
              Math.floor((s.selesaiEstimasi.getTime() - now) / 1000),
            ),
            biaya: s.biaya,
          }
        : null,
    };
  });
}

export async function getMachineSessions(
  tenantId: string,
  limit = 30,
) {
  const db = getDb();
  const rows = await db
    .select({
      id: machineSessions.id,
      mesin: machines.nama,
      konsumen: consumers.nama,
      mulai: machineSessions.mulai,
      durasiMenit: machineSessions.durasiMenit,
      biaya: machineSessions.biaya,
      metodeBayar: machineSessions.metodeBayar,
      status: machineSessions.status,
    })
    .from(machineSessions)
    .leftJoin(machines, eq(machineSessions.machineId, machines.id))
    .leftJoin(consumers, eq(machineSessions.consumerId, consumers.id))
    .where(eq(machineSessions.tenantId, tenantId))
    .orderBy(desc(machineSessions.mulai))
    .limit(limit);
  return rows.map((r) => ({ ...r, mulai: r.mulai.toISOString() }));
}
