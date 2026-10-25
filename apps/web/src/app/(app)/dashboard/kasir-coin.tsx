"use client";

import { useEffect, useState, useTransition } from "react";
import { remindOwnerTopup } from "@/lib/app-coin-actions";
import { formatRupiah } from "@/lib/format";
import { IconCoin } from "@/components/icons";

const COOLDOWN_MS = 30 * 60 * 1000; // 30 menit antar-pengingat per perangkat.

export function KasirCoinCard({
  saldo,
  biayaNota,
}: {
  saldo: number;
  biayaNota: number;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  const notaTersisa =
    biayaNota > 0 ? Math.floor(Math.max(0, saldo) / biayaNota) : 0;
  const habis = saldo <= 0;
  const menipis = saldo > 0 && saldo <= biayaNota * 20;

  useEffect(() => {
    try {
      const v = Number(localStorage.getItem("akalink_remind_until") || 0);
      if (v > Date.now()) setCooldownUntil(v);
    } catch {
      /* abaikan */
    }
  }, []);

  const sisaMenit = Math.ceil((cooldownUntil - Date.now()) / 60000);
  const onCooldown = cooldownUntil > Date.now();

  function ingatkan() {
    setMsg(null);
    start(async () => {
      const r = await remindOwnerTopup();
      if (!r.ok) {
        setMsg({ text: r.error ?? "Gagal mengirim pengingat." });
        return;
      }
      const until = Date.now() + COOLDOWN_MS;
      setCooldownUntil(until);
      try {
        localStorage.setItem("akalink_remind_until", String(until));
      } catch {
        /* abaikan */
      }
      // Buka WhatsApp bila belum terkirim otomatis (kasir tinggal tekan kirim).
      if (!r.waSent && r.waLink) window.open(r.waLink, "_blank");
      const bits: string[] = [];
      if (r.emailSent) bits.push("email");
      if (r.waSent) bits.push("WhatsApp otomatis");
      else if (r.waLink) bits.push("WhatsApp (buka chat)");
      setMsg({
        ok: true,
        text: bits.length
          ? `Pengingat dikirim ke pemilik via ${bits.join(" & ")}.`
          : "Pengingat diproses. Hubungi pemilik bila perlu.",
      });
    });
  }

  const tone = habis
    ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
    : menipis
      ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
      : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";

  return (
    <div className={`rounded-2xl border p-5 ${tone}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              habis
                ? "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400"
                : "bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400"
            }`}
          >
            <IconCoin className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Saldo Koin AkaLink
            </p>
            <p
              className={`text-xl font-bold ${habis ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}
            >
              {formatRupiah(saldo)}
            </p>
            <p className="text-xs text-slate-400">
              {habis
                ? "Saldo habis — nota tidak bisa dicetak"
                : `± ${notaTersisa.toLocaleString("id-ID")} nota lagi`}
            </p>
          </div>
        </div>
      </div>

      {(habis || menipis) && (
        <div className="mt-4">
          <button
            onClick={ingatkan}
            disabled={pending || onCooldown}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            🔔{" "}
            {pending
              ? "Mengirim…"
              : onCooldown
                ? `Sudah diingatkan (${sisaMenit} mnt)`
                : "Ingatkan Pemilik Isi Ulang"}
          </button>
          {msg && (
            <p
              className={`mt-2 text-xs ${msg.ok ? "text-green-600 dark:text-green-400" : "text-red-600"}`}
            >
              {msg.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
