"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { requestWithdraw } from "@/lib/withdrawals-actions";
import type { WithdrawalRow } from "@/lib/withdrawals";

const STATUS_LABEL: Record<WithdrawalRow["status"], string> = {
  pending: "Diproses",
  success: "Berhasil",
  failed: "Gagal",
  expired: "Kadaluarsa",
};

export function DanaClient({
  saldo,
  riwayat,
  aktif,
  withdrawFee,
  minWithdraw,
}: {
  saldo: number;
  riwayat: WithdrawalRow[];
  aktif: boolean;
  withdrawFee: number;
  minWithdraw: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState("");
  const [bankNama, setBankNama] = useState("");
  const [bankRekening, setBankRekening] = useState("");
  const [bankAtasNama, setBankAtasNama] = useState("");
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();

  const amt = Number(amount) || 0;
  const net = Math.max(0, amt - withdrawFee);

  function tarik() {
    setMsg(undefined);
    if (amt < minWithdraw) {
      setMsg({ text: `Minimal penarikan ${formatRupiah(minWithdraw)}.` });
      return;
    }
    if (amt > saldo) {
      setMsg({ text: "Jumlah melebihi saldo." });
      return;
    }
    if (!bankNama || !bankRekening || !bankAtasNama) {
      setMsg({ text: "Lengkapi data bank." });
      return;
    }
    start(async () => {
      const res = await requestWithdraw({
        amount: amt,
        bankNama,
        bankRekening,
        bankAtasNama,
      });
      if (res.ok) {
        setMsg({
          ok: true,
          text: `Penarikan ${formatRupiah(res.netAmount)} diproses ✓`,
        });
        setAmount("");
        router.refresh();
      } else {
        setMsg({ text: res.error });
      }
    });
  }

  const inputBase =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

  return (
    <div className="flex flex-col gap-6">
      {/* Kartu saldo */}
      <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-5 dark:border-green-900 dark:from-green-950/40 dark:to-slate-900">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Saldo Pembayaran Digital
        </p>
        <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
          {formatRupiah(saldo)}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Siap ditarik ke rekening bank Anda.
        </p>
      </div>

      {!aktif && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          Pembayaran digital belum aktif. Saldo hanya bertambah saat fitur
          diaktifkan di Pengaturan.
        </div>
      )}

      {/* Tarik dana */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
          Tarik Dana (Withdraw)
        </h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Biaya transfer {formatRupiah(withdrawFee)} per penarikan. Minimal{" "}
          {formatRupiah(minWithdraw)}.
        </p>

        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Jumlah penarikan
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-slate-400">Rp</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                placeholder={`min. ${minWithdraw}`}
                className={`${inputBase} w-full`}
              />
            </div>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Nama bank
              <input
                value={bankNama}
                onChange={(e) => setBankNama(e.target.value)}
                placeholder="mis. BCA"
                className={`${inputBase} mt-1 w-full`}
              />
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              No. rekening
              <input
                value={bankRekening}
                onChange={(e) =>
                  setBankRekening(e.target.value.replace(/[^0-9]/g, ""))
                }
                inputMode="numeric"
                placeholder="mis. 1234567890"
                className={`${inputBase} mt-1 w-full`}
              />
            </label>
          </div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Atas nama
            <input
              value={bankAtasNama}
              onChange={(e) => setBankAtasNama(e.target.value)}
              placeholder="Nama pemilik rekening"
              className={`${inputBase} mt-1 w-full`}
            />
          </label>

          {amt > 0 && (
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Jumlah tarik</span>
                <span>{formatRupiah(amt)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Biaya transfer</span>
                <span>− {formatRupiah(withdrawFee)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100">
                <span>Diterima di bank</span>
                <span>{formatRupiah(net)}</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={tarik}
              disabled={pending || saldo < minWithdraw}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {pending ? "Memproses…" : "Tarik Dana"}
            </button>
            {msg && (
              <span
                className={
                  msg.ok ? "text-sm text-green-600" : "text-sm text-red-600"
                }
              >
                {msg.text}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Riwayat penarikan */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Riwayat Penarikan
        </h2>
        {riwayat.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Belum ada penarikan.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {riwayat.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {w.bankNama} · {w.bankRekening}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(w.createdAt)} · a.n. {w.bankAtasNama}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {formatRupiah(w.netAmount)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {STATUS_LABEL[w.status]} · biaya {formatRupiah(w.fee)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
