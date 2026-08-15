"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import {
  getDb,
  b2bClients,
  invoices,
  consumers,
  transactions,
} from "@akalink/db";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { seedDefaultCoaIfEmpty } from "@/lib/coa";
import { postJournal, hasJournal } from "@/lib/journal";

export type B2bResult = { ok: true; id?: string } | { ok: false; error: string };

type OwnerCtx =
  | { ok: false; err: string }
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>; tenantId: string };

async function ownerCtx(): Promise<OwnerCtx> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return { ok: false, err: "Sesi tidak valid." };
  if (getRoleFromUser(user) !== "owner")
    return { ok: false, err: "Hanya pemilik yang dapat mengelola B2B." };
  return { ok: true, user, tenantId };
}

// ---- Klien B2B -----------------------------------------------------------
export async function createClient(input: {
  perusahaan: string;
  pic?: string;
  telepon?: string;
  email?: string;
  alamat?: string;
  npwp?: string;
  terminHari?: number | string;
}): Promise<B2bResult> {
  const c = await ownerCtx();
  if (!c.ok) return { ok: false, error: c.err };
  const perusahaan = String(input.perusahaan ?? "").trim();
  if (perusahaan.length < 2)
    return { ok: false, error: "Nama perusahaan wajib diisi." };
  const db = getDb();
  const [row] = await db
    .insert(b2bClients)
    .values({
      tenantId: c.tenantId,
      perusahaan,
      pic: input.pic?.trim() || null,
      telepon: input.telepon?.trim() || null,
      email: input.email?.trim() || null,
      alamat: input.alamat?.trim() || null,
      npwp: input.npwp?.trim() || null,
      terminHari: Math.max(0, Math.floor(Number(input.terminHari) || 30)),
    })
    .returning({ id: b2bClients.id });
  revalidatePath("/b2b");
  return { ok: true, id: row.id };
}

export async function updateClient(input: {
  id: string;
  perusahaan: string;
  pic?: string;
  telepon?: string;
  email?: string;
  alamat?: string;
  npwp?: string;
  terminHari?: number | string;
  aktif?: boolean;
}): Promise<B2bResult> {
  const c = await ownerCtx();
  if (!c.ok) return { ok: false, error: c.err };
  const db = getDb();
  await db
    .update(b2bClients)
    .set({
      perusahaan: String(input.perusahaan ?? "").trim(),
      pic: input.pic?.trim() || null,
      telepon: input.telepon?.trim() || null,
      email: input.email?.trim() || null,
      alamat: input.alamat?.trim() || null,
      npwp: input.npwp?.trim() || null,
      terminHari: Math.max(0, Math.floor(Number(input.terminHari) || 30)),
      aktif: input.aktif ?? true,
      updatedAt: new Date(),
    })
    .where(and(eq(b2bClients.id, input.id), eq(b2bClients.tenantId, c.tenantId)));
  revalidatePath("/b2b");
  revalidatePath(`/b2b/${input.id}`);
  return { ok: true };
}

export async function deleteClient(id: string): Promise<B2bResult> {
  const c = await ownerCtx();
  if (!c.ok) return { ok: false, error: c.err };
  const db = getDb();
  // Lepas tautan konsumen dulu.
  await db
    .update(consumers)
    .set({ b2bClientId: null })
    .where(and(eq(consumers.tenantId, c.tenantId), eq(consumers.b2bClientId, id)));
  await db
    .delete(b2bClients)
    .where(and(eq(b2bClients.id, id), eq(b2bClients.tenantId, c.tenantId)));
  revalidatePath("/b2b");
  return { ok: true };
}

// ---- Tautan konsumen -----------------------------------------------------
export async function linkConsumer(input: {
  clientId: string;
  consumerId: string;
}): Promise<B2bResult> {
  const c = await ownerCtx();
  if (!c.ok) return { ok: false, error: c.err };
  const db = getDb();
  await db
    .update(consumers)
    .set({ b2bClientId: input.clientId })
    .where(and(eq(consumers.id, input.consumerId), eq(consumers.tenantId, c.tenantId)));
  revalidatePath(`/b2b/${input.clientId}`);
  return { ok: true };
}

export async function unlinkConsumer(input: {
  clientId: string;
  consumerId: string;
}): Promise<B2bResult> {
  const c = await ownerCtx();
  if (!c.ok) return { ok: false, error: c.err };
  const db = getDb();
  await db
    .update(consumers)
    .set({ b2bClientId: null })
    .where(and(eq(consumers.id, input.consumerId), eq(consumers.tenantId, c.tenantId)));
  revalidatePath(`/b2b/${input.clientId}`);
  return { ok: true };
}

// ---- Invoice -------------------------------------------------------------
function genInvoiceNo(): string {
  const n = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  const ts =
    String(n.getFullYear()).slice(2) + p(n.getMonth() + 1) + p(n.getDate());
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `INV-${ts}-${rand}`;
}

/** Buat invoice dari transaksi tertunggak klien dalam periode tertentu. */
export async function createInvoice(input: {
  clientId: string;
  periodeAwal?: string;
  periodeAkhir?: string;
}): Promise<B2bResult> {
  const c = await ownerCtx();
  if (!c.ok) return { ok: false, error: c.err };
  const db = getDb();

  const [client] = await db
    .select()
    .from(b2bClients)
    .where(and(eq(b2bClients.id, input.clientId), eq(b2bClients.tenantId, c.tenantId)))
    .limit(1);
  if (!client) return { ok: false, error: "Klien tidak ditemukan." };

  // Konsumen tertaut.
  const linked = await db
    .select({ id: consumers.id })
    .from(consumers)
    .where(and(eq(consumers.tenantId, c.tenantId), eq(consumers.b2bClientId, input.clientId)));
  const cids = linked.map((l) => l.id);
  if (cids.length === 0)
    return { ok: false, error: "Belum ada konsumen tertaut ke klien ini." };

  // Transaksi tertunggak & belum ditagihkan.
  const txs = await db
    .select({
      id: transactions.id,
      grandTotal: transactions.grandTotal,
      tanggal: transactions.orderDiterima,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.tenantId, c.tenantId),
        isNull(transactions.invoiceId),
        ne(transactions.statusPembayaran, "lunas"),
        inArray(transactions.consumerId, cids),
      ),
    );

  const awal = input.periodeAwal ? new Date(input.periodeAwal) : null;
  const akhir = input.periodeAkhir ? new Date(input.periodeAkhir + "T23:59:59") : null;
  const included = txs.filter((t) => {
    const d = t.tanggal.getTime();
    if (awal && d < awal.getTime()) return false;
    if (akhir && d > akhir.getTime()) return false;
    return true;
  });
  if (included.length === 0)
    return { ok: false, error: "Tidak ada transaksi tertunggak pada periode ini." };

  const total = included.reduce((s, t) => s + Math.round(Number(t.grandTotal)), 0);
  const nomor = genInvoiceNo();
  const jatuhTempo = new Date(Date.now() + client.terminHari * 86_400_000);

  const invId = await db.transaction(async (tx) => {
    const [inv] = await tx
      .insert(invoices)
      .values({
        tenantId: c.tenantId,
        b2bClientId: input.clientId,
        nomor,
        periodeAwal: input.periodeAwal || null,
        periodeAkhir: input.periodeAkhir || null,
        jatuhTempo: jatuhTempo.toISOString().slice(0, 10),
        total,
        status: "terbit",
      })
      .returning({ id: invoices.id });

    await tx
      .update(transactions)
      .set({ invoiceId: inv.id })
      .where(
        and(
          eq(transactions.tenantId, c.tenantId),
          inArray(
            transactions.id,
            included.map((t) => t.id),
          ),
        ),
      );
    return inv.id;
  });

  revalidatePath("/b2b");
  revalidatePath(`/b2b/${input.clientId}`);
  return { ok: true, id: invId };
}

/** Tandai invoice lunas: lunasi seluruh transaksi + jurnal pelunasan. */
export async function markInvoicePaid(input: {
  id: string;
  akun?: "1.1.02" | "1.1.04";
}): Promise<B2bResult> {
  const c = await ownerCtx();
  if (!c.ok) return { ok: false, error: c.err };
  const db = getDb();

  const [inv] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, input.id), eq(invoices.tenantId, c.tenantId)))
    .limit(1);
  if (!inv) return { ok: false, error: "Invoice tidak ditemukan." };
  if (inv.status === "lunas") return { ok: true };

  const akun = input.akun === "1.1.04" ? "1.1.04" : "1.1.02";
  await seedDefaultCoaIfEmpty(c.tenantId);

  const items = await db
    .select({
      id: transactions.id,
      noNota: transactions.noNota,
      grandTotal: transactions.grandTotal,
    })
    .from(transactions)
    .where(
      and(eq(transactions.tenantId, c.tenantId), eq(transactions.invoiceId, input.id)),
    );

  await db.transaction(async (tx) => {
    for (const t of items) {
      const grand = Math.round(Number(t.grandTotal));
      await tx
        .update(transactions)
        .set({ statusPembayaran: "lunas", updatedAt: new Date() })
        .where(eq(transactions.id, t.id));
      if (grand > 0 && !(await hasJournal(c.tenantId, "pelunasan", t.id))) {
        await postJournal(tx, c.tenantId, {
          keterangan: `Pelunasan ${t.noNota} (Invoice ${inv.nomor})`,
          refType: "pelunasan",
          refId: t.id,
          lines: [
            { kode: akun, debit: grand },
            { kode: "1.2", kredit: grand },
          ],
        });
      }
    }
    await tx
      .update(invoices)
      .set({ status: "lunas", lunasAt: new Date() })
      .where(eq(invoices.id, input.id));
  });

  revalidatePath("/b2b");
  revalidatePath(`/b2b/${inv.b2bClientId}`);
  revalidatePath(`/b2b/invoice/${input.id}`);
  return { ok: true };
}

export async function cancelInvoice(id: string): Promise<B2bResult> {
  const c = await ownerCtx();
  if (!c.ok) return { ok: false, error: c.err };
  const db = getDb();
  const [inv] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.tenantId, c.tenantId)))
    .limit(1);
  if (!inv) return { ok: false, error: "Invoice tidak ditemukan." };
  if (inv.status === "lunas")
    return { ok: false, error: "Invoice sudah lunas, tidak bisa dibatalkan." };

  await db.transaction(async (tx) => {
    // Lepas transaksi agar bisa ditagihkan ulang.
    await tx
      .update(transactions)
      .set({ invoiceId: null })
      .where(
        and(eq(transactions.tenantId, c.tenantId), eq(transactions.invoiceId, id)),
      );
    await tx.update(invoices).set({ status: "batal" }).where(eq(invoices.id, id));
  });

  revalidatePath("/b2b");
  revalidatePath(`/b2b/${inv.b2bClientId}`);
  return { ok: true };
}
