"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format";
import { deleteTransaction } from "@/lib/transactions-actions";
import {
  requestDeletion,
  approveDeletion,
  rejectDeletion,
} from "@/lib/delete-request-actions";
import type { DeleteRequestRow } from "@/lib/delete-requests";

export function DeleteNota({
  txId,
  isOwner,
  pending,
}: {
  txId: string;
  isOwner: boolean;
  pending: DeleteRequestRow | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [busy, start] = useTransition();
  const [error, setError] = useState<string>();
  const [okMsg, setOkMsg] = useState<string>();

  const valid = alasan.trim().length >= 3;
  const refresh = () => router.refresh();

  // Aksi pemilik: hapus langsung.
  function hapusLangsung() {
    if (!valid) return setError("Isi alasan penghapusan terlebih dahulu.");
    setError(undefined);
    start(async () => {
      const res = await deleteTransaction(txId, alasan.trim());
      if (res.ok) {
        router.replace("/transaksi");
        router.refresh();
      } else setError(res.error);
    });
  }

  // Aksi staf: ajukan permintaan hapus.
  function ajukan() {
    if (!valid) return setError("Isi alasan penghapusan terlebih dahulu.");
    setError(undefined);
    start(async () => {
      const res = await requestDeletion({ transactionId: txId, alasan: alasan.trim() });
      if (res.ok) {
        setOkMsg("Permintaan hapus terkirim. Menunggu persetujuan pemilik.");
        setOpen(false);
        refresh();
      } else setError(res.error);
    });
  }

  // ---- Ada permintaan pending ----
  if (pending) {
    return (
      <section className="no-print rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
        <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          ⏳ Menunggu Persetujuan Hapus
        </h2>
        <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-400/90">
          Diajukan oleh{" "}
          <b>{pending.requestedByNama ?? "Staf"}</b> ·{" "}
          {formatDateTime(pending.createdAt)}
        </p>
        <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
          Alasan: {pending.alasan}
        </p>

        {isOwner ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                start(async () => {
                  const res = await approveDeletion(pending.id);
                  if (res.ok) {
                    router.replace("/transaksi");
                    router.refresh();
                  } else setError(res.error);
                })
              }
              disabled={busy}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? "Memproses…" : "Setujui & Hapus"}
            </button>
            <button
              type="button"
              onClick={() =>
                start(async () => {
                  const res = await rejectDeletion({ requestId: pending.id });
                  if (res.ok) refresh();
                  else setError(res.error);
                })
              }
              disabled={busy}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Tolak
            </button>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        ) : (
          <p className="mt-3 text-xs text-amber-700/80 dark:text-amber-400/80">
            Nota ini akan dihapus jika pemilik menyetujui.
          </p>
        )}
      </section>
    );
  }

  // ---- Tidak ada permintaan pending ----
  return (
    <section className="no-print rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/50 dark:bg-red-950/20">
      <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">
        Zona Berbahaya
      </h2>
      <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">
        {isOwner
          ? "Menghapus nota bersifat permanen — data transaksi, item, dan jurnal terkait ikut terhapus. Tindakan ini tidak bisa dibatalkan."
          : "Anda dapat mengajukan penghapusan nota. Nota akan dihapus hanya setelah disetujui pemilik."}
      </p>

      {okMsg && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
          {okMsg}
        </p>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setAlasan("");
            setError(undefined);
            setOkMsg(undefined);
          }}
          className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-600 hover:text-white dark:border-red-800 dark:bg-transparent"
        >
          {isOwner ? "Hapus Nota" : "Ajukan Hapus Nota"}
        </button>
      ) : (
        <div className="mt-4 rounded-xl border border-red-200 bg-white p-4 dark:border-red-900/50 dark:bg-slate-900">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Alasan penghapusan
          </label>
          <textarea
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="mis. Salah input, transaksi dobel, dibatalkan konsumen…"
            rows={2}
            autoFocus
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={isOwner ? hapusLangsung : ajukan}
              disabled={!valid || busy}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy
                ? "Memproses…"
                : isOwner
                  ? "Ya, hapus permanen"
                  : "Kirim Permintaan"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
