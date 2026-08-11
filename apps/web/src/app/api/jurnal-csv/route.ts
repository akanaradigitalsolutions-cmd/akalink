import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getJurnal } from "@/lib/journal";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

function esc(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return new Response("Unauthorized", { status: 401 });

  const entries = await getJurnal(tenantId, 2000);
  const rows: string[][] = [
    ["Tanggal", "Keterangan", "Ref", "Kode Akun", "Akun", "Debit", "Kredit"],
  ];
  for (const e of entries) {
    for (const l of e.lines) {
      rows.push([
        formatDateTime(e.tanggal),
        e.keterangan,
        e.refType ?? "",
        l.kode ?? "",
        l.nama ?? "",
        String(l.debit),
        String(l.kredit),
      ]);
    }
  }

  // BOM agar Excel membaca UTF-8 dengan benar.
  const csv = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="jurnal-akalink.csv"',
    },
  });
}
