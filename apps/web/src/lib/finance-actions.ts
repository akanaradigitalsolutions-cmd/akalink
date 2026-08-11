"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@akalink/db";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { seedDefaultCoaIfEmpty } from "@/lib/coa";
import { postJournal } from "@/lib/journal";

export type FinanceResult = { ok: true } | { ok: false; error: string };

type FinanceInput = {
  jenis: string;
  jumlah: number | string;
  keterangan?: string;
  tanggal?: string;
  akunBebanKode?: string;
  kasKode?: string;
  dariKode?: string;
  keKode?: string;
};

export async function catatKeuangan(
  input: FinanceInput,
): Promise<FinanceResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId)
    return { ok: false, error: "Sesi tidak valid. Silakan masuk lagi." };

  const jumlah = Number(input.jumlah);
  if (!(jumlah > 0)) return { ok: false, error: "Jumlah harus lebih dari 0." };

  const keterangan = String(input.keterangan ?? "").trim();
  const tanggal = input.tanggal ? new Date(String(input.tanggal)) : new Date();
  const jenis = String(input.jenis);

  await seedDefaultCoaIfEmpty(tenantId);

  let lines: { kode: string; debit?: number; kredit?: number }[];
  let ket: string;
  let refType: string;

  if (jenis === "pengeluaran") {
    const beban = String(input.akunBebanKode ?? "");
    const kas = String(input.kasKode ?? "");
    if (!beban || !kas)
      return { ok: false, error: "Pilih akun beban dan sumber kas." };
    lines = [
      { kode: beban, debit: jumlah },
      { kode: kas, kredit: jumlah },
    ];
    ket = keterangan || "Pengeluaran biaya";
    refType = "pengeluaran";
  } else if (jenis === "modal") {
    const kas = String(input.kasKode ?? "");
    if (!kas) return { ok: false, error: "Pilih kas tujuan." };
    lines = [
      { kode: kas, debit: jumlah },
      { kode: "3.1", kredit: jumlah },
    ];
    ket = keterangan || "Setoran modal";
    refType = "modal";
  } else if (jenis === "prive") {
    const kas = String(input.kasKode ?? "");
    if (!kas) return { ok: false, error: "Pilih sumber kas." };
    lines = [
      { kode: "3.9", debit: jumlah },
      { kode: kas, kredit: jumlah },
    ];
    ket = keterangan || "Prive (pengambilan pemilik)";
    refType = "prive";
  } else if (jenis === "transfer") {
    const dari = String(input.dariKode ?? "");
    const ke = String(input.keKode ?? "");
    if (!dari || !ke || dari === ke)
      return { ok: false, error: "Pilih kas asal & tujuan yang berbeda." };
    lines = [
      { kode: ke, debit: jumlah },
      { kode: dari, kredit: jumlah },
    ];
    ket = keterangan || "Transfer kas";
    refType = "transfer";
  } else {
    return { ok: false, error: "Jenis transaksi tidak dikenal." };
  }

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      await postJournal(tx, tenantId, {
        tanggal,
        keterangan: ket,
        refType,
        lines,
      });
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal menyimpan.",
    };
  }

  revalidatePath("/keuangan/jurnal");
  revalidatePath("/keuangan/buku-besar");
  revalidatePath("/keuangan/laba-rugi");
  revalidatePath("/keuangan/neraca");
  revalidatePath("/keuangan/catat");
  return { ok: true };
}
