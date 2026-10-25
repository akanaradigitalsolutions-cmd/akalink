import "server-only";

import nodemailer from "nodemailer";

/**
 * Pengiriman notifikasi ke pemilik (email + WhatsApp).
 * - Email: via SMTP (env SMTP_HOST/PORT/USER/PASS/FROM). Reuse kredensial
 *   Hostinger yang sama dengan Supabase. Bila belum diset → tidak terkirim.
 * - WhatsApp: via Fonnte (env FONNTE_TOKEN) bila diset. Selalu sediakan
 *   tautan wa.me sebagai cadangan (dibuka manual oleh kasir).
 */

export async function sendOwnerEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 465);
  const from = process.env.SMTP_FROM || user;
  if (!host || !user || !pass || !to) return false;
  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({ from: `AkaLink <${from}>`, to, subject, html });
    return true;
  } catch (e) {
    console.error("[notify] email:", e instanceof Error ? e.message : e);
    return false;
  }
}

/** Kirim WhatsApp via Fonnte (otomatis) bila FONNTE_TOKEN diset. */
export async function sendWhatsappFonnte(
  phone: string,
  message: string,
): Promise<boolean> {
  const token = process.env.FONNTE_TOKEN;
  const target = (phone || "").replace(/[^\d]/g, "");
  if (!token || !target) return false;
  try {
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ target, message }).toString(),
    });
    return res.ok;
  } catch (e) {
    console.error("[notify] wa:", e instanceof Error ? e.message : e);
    return false;
  }
}

export function waMeLink(phone: string, message: string): string {
  const p = (phone || "").replace(/[^\d]/g, "");
  return `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
}
