import { and, eq, gte, lte } from "drizzle-orm";
import { getDb, transactions, consumers } from "@akalink/db";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { normalizeYmd, presetRange } from "@/lib/laporan";
import { formatDateTime, LABEL_STATUS_BAYAR, LABEL_STATUS_KERJA } from "@/lib/format";

export const dynamic = "force-dynamic";

function esc(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const base = presetRange("bulan");
  const dari = normalizeYmd(url.searchParams.get("dari"), base.dari);
  const sampai = normalizeYmd(url.searchParams.get("sampai"), base.sampai);
  const start = new Date(`${dari}T00:00:00.000+08:00`);
  const end = new Date(`${sampai}T23:59:59.999+08:00`);
  const outletParam = url.searchParams.get("outlet");
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const outletId =
    outletParam && UUID_RE.test(outletParam) ? outletParam : null;

  const db = getDb();
  const rows = await db
    .select({
      noNota: transactions.noNota,
      createdAt: transactions.createdAt,
      tipe: transactions.tipe,
      konsumen: consumers.nama,
      subtotal: transactions.subtotal,
      diskon: transactions.diskon,
      biayaExpress: transactions.biayaExpress,
      grandTotal: transactions.grandTotal,
      statusPembayaran: transactions.statusPembayaran,
      statusPekerjaan: transactions.statusPekerjaan,
    })
    .from(transactions)
    .leftJoin(consumers, eq(transactions.consumerId, consumers.id))
    .where(
      and(
        eq(transactions.tenantId, tenantId),
        gte(transactions.createdAt, start),
        lte(transactions.createdAt, end),
        outletId ? eq(transactions.outletId, outletId) : undefined,
      ),
    )
    .orderBy(transactions.createdAt);

  const out: string[][] = [
    [
      "No Nota",
      "Tanggal",
      "Tipe",
      "Konsumen",
      "Subtotal",
      "Diskon",
      "Express",
      "Total",
      "Pembayaran",
      "Pengerjaan",
    ],
  ];
  for (const t of rows) {
    out.push([
      t.noNota,
      formatDateTime(t.createdAt),
      t.tipe,
      t.konsumen ?? "Umum",
      String(t.subtotal),
      String(t.diskon),
      String(t.biayaExpress),
      String(t.grandTotal),
      LABEL_STATUS_BAYAR[t.statusPembayaran] ?? t.statusPembayaran,
      LABEL_STATUS_KERJA[t.statusPekerjaan] ?? t.statusPekerjaan,
    ]);
  }

  // BOM agar Excel membaca UTF-8 dengan benar.
  const csv = "﻿" + out.map((r) => r.map(esc).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-${dari}_${sampai}.csv"`,
    },
  });
}
