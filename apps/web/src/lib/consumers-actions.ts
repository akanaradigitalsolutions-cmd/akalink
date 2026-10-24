"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, consumers } from "@akalink/db";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";

export type ConsumerFormState =
  | { error?: string; fieldErrors?: Record<string, string>; ok?: boolean }
  | undefined;

/** Normalisasi nomor HP ke format 62xxxxxxxxxx. */
function normalizeHp(hp?: string | null): string | null {
  if (!hp) return null;
  let s = hp.replace(/[\s\-().]/g, "");
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("0")) s = "62" + s.slice(1);
  else if (s.startsWith("8")) s = "62" + s;
  return s.length > 0 ? s : null;
}

const schema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi"),
  hp: z.string().trim().optional(),
  gender: z.enum(["pria", "wanita"]).optional(),
  instansi: z.string().trim().optional(),
  email: z.string().trim().email("Format email tidak valid").optional(),
  tanggalLahir: z.string().trim().optional(),
  agama: z.string().trim().optional(),
});

function fieldErrorsFrom(err: z.ZodError): Record<string, string> {
  const fe: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fe[key]) fe[key] = issue.message;
  }
  return fe;
}

export async function createConsumer(
  _prev: ConsumerFormState,
  formData: FormData,
): Promise<ConsumerFormState> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return { error: "Sesi tidak valid. Silakan masuk lagi." };

  const g = formData.get("gender");
  const parsed = schema.safeParse({
    nama: formData.get("nama"),
    hp: (formData.get("hp") as string) || undefined,
    gender: g === "pria" || g === "wanita" ? g : undefined,
    instansi: (formData.get("instansi") as string) || undefined,
    email: (formData.get("email") as string) || undefined,
    tanggalLahir: (formData.get("tanggalLahir") as string) || undefined,
    agama: (formData.get("agama") as string) || undefined,
  });

  if (!parsed.success) {
    return {
      error: "Mohon periksa kembali isian.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const d = parsed.data;
  const db = getDb();
  await db.insert(consumers).values({
    tenantId,
    nama: d.nama,
    hp: normalizeHp(d.hp),
    gender: d.gender ?? null,
    instansi: d.instansi ?? null,
    email: d.email ?? null,
    tanggalLahir: d.tanggalLahir ?? null,
    agama: d.agama ?? null,
  });

  revalidatePath("/konsumen");
  return { ok: true };
}

export type QuickConsumerResult =
  | { ok: true; consumer: { id: string; nama: string; hp: string | null } }
  | { ok: false; error: string };

/**
 * Buat konsumen cepat dari layar POS (Transaksi Baru) dan kembalikan
 * data yang baru dibuat agar bisa langsung dipilih tanpa reload.
 */
export async function quickCreateConsumer(input: {
  nama: string;
  hp?: string;
}): Promise<QuickConsumerResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId)
    return { ok: false, error: "Sesi tidak valid. Silakan masuk lagi." };

  const nama = String(input.nama ?? "").trim();
  if (nama.length < 1) return { ok: false, error: "Nama konsumen wajib diisi." };

  const db = getDb();
  const [row] = await db
    .insert(consumers)
    .values({
      tenantId,
      nama,
      hp: normalizeHp(input.hp),
    })
    .returning({ id: consumers.id, nama: consumers.nama, hp: consumers.hp });

  revalidatePath("/konsumen");
  return { ok: true, consumer: row };
}

// ---- Impor massal (CSV) --------------------------------------------------
export type ImportResult = {
  ok: boolean;
  inserted: number;
  failed: number;
  errors: { baris: number; pesan: string }[];
  error?: string;
};

const importRowSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi"),
  hp: z.string().trim().optional(),
  gender: z.enum(["pria", "wanita"]).optional(),
  email: z.string().trim().email("Email tidak valid").optional(),
  instansi: z.string().trim().optional(),
  tanggalLahir: z.string().trim().optional(),
  agama: z.string().trim().optional(),
});

export async function importConsumers(
  rows: Record<string, string>[],
): Promise<ImportResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId)
    return { ok: false, inserted: 0, failed: 0, errors: [], error: "Sesi tidak valid. Masuk lagi." };
  if (!Array.isArray(rows) || rows.length === 0)
    return { ok: false, inserted: 0, failed: 0, errors: [], error: "File kosong atau format salah." };
  if (rows.length > 1000)
    return { ok: false, inserted: 0, failed: 0, errors: [], error: "Maksimal 1000 baris per impor." };

  const values: (typeof consumers.$inferInsert)[] = [];
  const errors: { baris: number; pesan: string }[] = [];

  rows.forEach((r, i) => {
    const g = (r.gender || "").trim().toLowerCase();
    const tgl = (r.tanggal_lahir || "").trim();
    const parsed = importRowSchema.safeParse({
      nama: r.nama,
      hp: (r.hp || "").trim() || undefined,
      gender: g === "pria" || g === "wanita" ? g : undefined,
      email: (r.email || "").trim() || undefined,
      instansi: (r.instansi || "").trim() || undefined,
      tanggalLahir: /^\d{4}-\d{2}-\d{2}$/.test(tgl) ? tgl : undefined,
      agama: (r.agama || "").trim() || undefined,
    });
    if (!parsed.success) {
      errors.push({
        baris: i + 2,
        pesan: parsed.error.issues[0]?.message ?? "Data tidak valid",
      });
      return;
    }
    const d = parsed.data;
    values.push({
      tenantId,
      nama: d.nama,
      hp: normalizeHp(d.hp),
      gender: d.gender ?? null,
      email: d.email ?? null,
      instansi: d.instansi ?? null,
      tanggalLahir: d.tanggalLahir ?? null,
      agama: d.agama ?? null,
    });
  });

  const db = getDb();
  if (values.length) await db.insert(consumers).values(values);
  revalidatePath("/konsumen");
  return { ok: true, inserted: values.length, failed: errors.length, errors };
}

export async function deleteConsumer(formData: FormData) {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return;
  const id = String(formData.get("id"));
  const db = getDb();
  await db
    .delete(consumers)
    .where(and(eq(consumers.id, id), eq(consumers.tenantId, tenantId)));
  revalidatePath("/konsumen");
}
