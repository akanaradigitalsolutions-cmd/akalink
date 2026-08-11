"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTransaction } from "@/lib/transactions-actions";

export function DeleteNota({
  txId,
  noNota,
}: {
  txId: string;
  noNota: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  const cocok = confirm.trim() === noNota;

  function hapus() {
    if (!cocok) return;
    setError(undefined);
    start(async () => {
      const res = await deleteTransaction(txId);
      if (res.ok) {
        router.replace("/transaksi");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <section className="no-print rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/50 dark:bg-red-950/20">
      <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">
        Zona Berbahaya
      </h2>
      <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">
        Menghapus nota bersifat permanen — data transaksi, item, dan jurnal
        terkait (penjualan &amp; pelunasan) ikut terhapus. Tindakan ini tidak
        bisa dibatalkan.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setConfirm("");
            setError(undefined);
          }}
          className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-600 hover:text-white dark:border-red-800 dark:bg-transparent"
        >
          Hapus Nota
        </button>
      ) : (
        <div className="mt-4 rounded-xl border border-red-200 bg-white p-4 dark:border-red-900/50 dark:bg-slate-900">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            Untuk konfirmasi, ketik nomor nota{" "}
            <span className="font-mono font-semibold text-red-600">
              {noNota}
            </span>{" "}
            di bawah ini.
          </p>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={noNota}
            autoFocus
            className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={hapus}
              disabled={!cocok || pending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Menghapus…" : "Ya, hapus permanen"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
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
