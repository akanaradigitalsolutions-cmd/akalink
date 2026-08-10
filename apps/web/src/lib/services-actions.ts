"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, services } from "@akalink/db";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";

export type ServiceFormState =
  | { error?: string; fieldErrors?: Record<string, string>; ok?: boolean }
  | undefined;

const schema = z.object({
  nama: z.string().trim().min(1, "Nama layanan wajib diisi"),
  tipeSatuan: z.enum(["kiloan", "satuan", "koin", "luas"]),
  harga: z.coerce.number().min(0, "Harga tidak boleh negatif"),
  estimasiNilai: z.coerce.number().int().min(0).max(9999).optional(),
  estimasiSatuan: z.enum(["jam", "hari"]).default("jam"),
  kategori: z.string().trim().optional(),
  expressTersedia: z.boolean().optional(),
});

function fieldErrorsFrom(err: z.ZodError): Record<string, string> {
  const fe: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fe[key]) fe[key] = issue.message;
  }
  return fe;
}

async function requireTenant() {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return null;
  return tenantId;
}

export async function createService(
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const tenantId = await requireTenant();
  if (!tenantId) return { error: "Sesi tidak valid. Silakan masuk lagi." };

  const estimasiRaw = formData.get("estimasiNilai");
  const parsed = schema.safeParse({
    nama: formData.get("nama"),
    tipeSatuan: formData.get("tipeSatuan"),
    harga: formData.get("harga"),
    estimasiNilai: estimasiRaw ? estimasiRaw : undefined,
    estimasiSatuan: (formData.get("estimasiSatuan") as string) || "jam",
    kategori: (formData.get("kategori") as string) || undefined,
    expressTersedia: formData.get("expressTersedia") === "on",
  });

  if (!parsed.success) {
    return {
      error: "Mohon periksa kembali isian.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const d = parsed.data;
  const db = getDb();
  await db.insert(services).values({
    tenantId,
    nama: d.nama,
    tipeSatuan: d.tipeSatuan,
    harga: String(d.harga),
    estimasiNilai: d.estimasiNilai ?? null,
    estimasiSatuan: d.estimasiSatuan,
    kategori: d.kategori ?? null,
    expressTersedia: d.expressTersedia ?? false,
  });

  revalidatePath("/layanan");
  return { ok: true };
}

export async function deleteService(formData: FormData) {
  const tenantId = await requireTenant();
  if (!tenantId) return;
  const id = String(formData.get("id"));
  const db = getDb();
  await db
    .delete(services)
    .where(and(eq(services.id, id), eq(services.tenantId, tenantId)));
  revalidatePath("/layanan");
}

export async function toggleService(formData: FormData) {
  const tenantId = await requireTenant();
  if (!tenantId) return;
  const id = String(formData.get("id"));
  const db = getDb();
  await db
    .update(services)
    .set({ aktif: sql`NOT ${services.aktif}`, updatedAt: new Date() })
    .where(and(eq(services.id, id), eq(services.tenantId, tenantId)));
  revalidatePath("/layanan");
}
