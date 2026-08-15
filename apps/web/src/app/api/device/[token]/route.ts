import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, machines, machineSessions } from "@akalink/db";

export const dynamic = "force-dynamic";

/**
 * API perangkat (relay IoT). Perangkat memanggil endpoint ini secara berkala
 * (polling) memakai device_token-nya. Balasan berisi keadaan relay yang
 * diinginkan; perangkat menyalakan/mematikan sesuai `on` & `remaining_sec`.
 *
 *   GET /api/device/{token}
 *   → { ok, machine, status, on, remaining_sec }
 *
 * Setiap panggilan memperbarui last_seen_at (untuk indikator online).
 * Aman dipakai lewat koneksi service (bypass RLS); dicocokkan via token.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 8)
    return NextResponse.json({ ok: false, error: "token tidak valid" }, { status: 400 });

  const db = getDb();
  const [m] = await db
    .select()
    .from(machines)
    .where(eq(machines.deviceToken, token))
    .limit(1);
  if (!m)
    return NextResponse.json({ ok: false, error: "perangkat tidak dikenal" }, { status: 404 });

  // Tandai online.
  await db
    .update(machines)
    .set({ lastSeenAt: new Date() })
    .where(eq(machines.id, m.id));

  // Cari sesi berjalan.
  const [sesi] = await db
    .select({
      id: machineSessions.id,
      selesaiEstimasi: machineSessions.selesaiEstimasi,
      status: machineSessions.status,
    })
    .from(machineSessions)
    .where(
      and(
        eq(machineSessions.machineId, m.id),
        eq(machineSessions.status, "running"),
      ),
    )
    .limit(1);

  let on = false;
  let remaining = 0;
  if (sesi) {
    const rem = Math.floor((sesi.selesaiEstimasi.getTime() - Date.now()) / 1000);
    if (rem > 0) {
      on = true;
      remaining = rem;
    } else {
      // Waktu habis → selesaikan sesi & matikan.
      await db
        .update(machineSessions)
        .set({ status: "selesai", selesai: sesi.selesaiEstimasi })
        .where(eq(machineSessions.id, sesi.id));
      await db
        .update(machines)
        .set({ status: "idle", updatedAt: new Date() })
        .where(eq(machines.id, m.id));
    }
  }

  return NextResponse.json({
    ok: true,
    machine: m.nama,
    status: on ? "running" : "idle",
    on,
    remaining_sec: remaining,
  });
}
