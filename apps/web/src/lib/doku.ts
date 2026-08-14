import "server-only";

import crypto from "node:crypto";

/**
 * ============================================================================
 *  Integrasi DOKU (Checkout / non-SNAP)
 * ----------------------------------------------------------------------------
 *  Dipakai untuk isi ulang Saldo Koin AkaLink (owner) dan — nantinya —
 *  pembayaran konsumen (QRIS/e-wallet).
 *
 *  Kredensial dibaca dari environment variable:
 *    DOKU_CLIENT_ID    — Client ID dari DOKU Back Office
 *    DOKU_SECRET_KEY   — Secret Key dari DOKU Back Office
 *    DOKU_ENV          — "sandbox" (default) atau "production"
 *
 *  Tanda tangan (signature) mengikuti spesifikasi DOKU:
 *    Digest    = base64( sha256( body ) )
 *    Komponen  = "Client-Id:...\nRequest-Id:...\nRequest-Timestamp:...\n
 *                 Request-Target:...\nDigest:..."  (tanpa newline di akhir)
 *    Signature = "HMACSHA256=" + base64( HMAC-SHA256(secret, komponen) )
 * ============================================================================
 */

const CLIENT_ID = process.env.DOKU_CLIENT_ID ?? "";
const SECRET_KEY = process.env.DOKU_SECRET_KEY ?? "";
const ENV = (process.env.DOKU_ENV ?? "sandbox").toLowerCase();

export function isDokuConfigured(): boolean {
  return CLIENT_ID.length > 0 && SECRET_KEY.length > 0;
}

export function dokuBaseUrl(): string {
  return ENV === "production"
    ? "https://api.doku.com"
    : "https://api-sandbox.doku.com";
}

/** Timestamp ISO-8601 UTC tanpa milidetik, mis. 2026-08-14T03:04:05Z. */
function nowTimestamp(): string {
  return new Date().toISOString().split(".")[0] + "Z";
}

function digestOf(body: string): string {
  return crypto.createHash("sha256").update(body, "utf8").digest("base64");
}

/**
 * Bangun tanda tangan permintaan. Untuk metode GET (tanpa body), baris Digest
 * dihilangkan sesuai spesifikasi DOKU.
 */
function buildSignature(opts: {
  requestId: string;
  timestamp: string;
  requestTarget: string;
  body?: string;
}): string {
  const lines = [
    `Client-Id:${CLIENT_ID}`,
    `Request-Id:${opts.requestId}`,
    `Request-Timestamp:${opts.timestamp}`,
    `Request-Target:${opts.requestTarget}`,
  ];
  if (opts.body != null && opts.body.length > 0) {
    lines.push(`Digest:${digestOf(opts.body)}`);
  }
  const component = lines.join("\n");
  const hmac = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(component, "utf8")
    .digest("base64");
  return `HMACSHA256=${hmac}`;
}

export type DokuPaymentResult = {
  url: string;
  tokenId: string | null;
};

/**
 * Buat sesi pembayaran Checkout DOKU. Mengembalikan URL yang dituju konsumen.
 * Melempar Error dengan pesan dari DOKU bila gagal.
 */
export async function createCheckoutPayment(input: {
  invoiceNumber: string;
  amount: number;
  callbackUrl: string;
  customer?: { name?: string; email?: string };
  lineItemName?: string;
}): Promise<DokuPaymentResult> {
  if (!isDokuConfigured())
    throw new Error(
      "DOKU belum dikonfigurasi (DOKU_CLIENT_ID / DOKU_SECRET_KEY).",
    );

  const requestTarget = "/checkout/v1/payment";
  const requestId = crypto.randomUUID();
  const timestamp = nowTimestamp();

  const bodyObj = {
    order: {
      amount: input.amount,
      invoice_number: input.invoiceNumber,
      currency: "IDR",
      callback_url: input.callbackUrl,
      line_items: input.lineItemName
        ? [{ name: input.lineItemName, price: input.amount, quantity: 1 }]
        : undefined,
    },
    payment: { payment_due_date: 60 },
    customer: input.customer
      ? { name: input.customer.name, email: input.customer.email }
      : undefined,
  };
  const body = JSON.stringify(bodyObj);

  const signature = buildSignature({
    requestId,
    timestamp,
    requestTarget,
    body,
  });

  const res = await fetch(`${dokuBaseUrl()}${requestTarget}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Id": CLIENT_ID,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      Signature: signature,
    },
    body,
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg = extractDokuError(json) ?? `DOKU error (HTTP ${res.status}).`;
    throw new Error(msg);
  }

  const payment = (json as { payment?: { url?: string; token_id?: string } })
    ?.payment;
  if (!payment?.url)
    throw new Error("DOKU tidak mengembalikan URL pembayaran.");

  return { url: payment.url, tokenId: payment.token_id ?? null };
}

function extractDokuError(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const j = json as { message?: unknown; error?: { message?: unknown } };
  if (Array.isArray(j.message)) return j.message.join("; ");
  if (typeof j.message === "string") return j.message;
  if (j.error && typeof j.error.message === "string") return j.error.message;
  return null;
}

/**
 * Verifikasi tanda tangan notifikasi (webhook) DOKU. `rawBody` = body mentah
 * persis seperti diterima. `requestTarget` = path notifikasi kita.
 */
export function verifyNotificationSignature(opts: {
  clientId: string | null;
  requestId: string | null;
  timestamp: string | null;
  signature: string | null;
  requestTarget: string;
  rawBody: string;
}): boolean {
  if (!isDokuConfigured()) return false;
  if (!opts.signature || !opts.requestId || !opts.timestamp) return false;
  // Client-Id harus cocok bila dikirim.
  if (opts.clientId && opts.clientId !== CLIENT_ID) return false;

  const expected = buildSignature({
    requestId: opts.requestId,
    timestamp: opts.timestamp,
    requestTarget: opts.requestTarget,
    body: opts.rawBody,
  });

  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(opts.signature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
