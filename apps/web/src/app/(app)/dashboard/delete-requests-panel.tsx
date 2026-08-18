"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format";
import { approveDeletion, rejectDeletion } from "@/lib/delete-request-actions";
import type { DeleteRequestRow } from "@/lib/delete-requests";

export function DeleteRequestsPanel({
  requests,
  isOwner,
}: {
  requests: DeleteRequestRow[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();

  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-200 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
          ⏳
        </span>
        <div>
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {isOwner
              ? `Permintaan Hapus Nota (${requests.length})`
              : `Menunggu Persetujuan Hapus (${requests.length})`}
          </h3>
          <p className="text-xs text-amber-700/90 dark:text-amber-400/90">
            {isOwner
              ? "Staf mengajukan penghapusan nota. Tinjau lalu setujui atau tolak."
              : "Nota berikut menunggu persetujuan pemilik untuk dihapus."}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col divide-y divide-amber-200/70 dark:divide-amber-900/50">
        {requests.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                {r.transactionId ? (
                  <Link
                    href={`/transaksi/${r.transactionId}`}
                    className="font-mono hover:underline"
                  >
                    {r.noNota}
                  </Link>
                ) : (
                  <span className="font-mono">{r.noNota}</span>
                )}
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                  Menunggu
                </span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Oleh {r.requestedByNama ?? "Staf"} · {formatDateTime(r.createdAt)}
              </p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                Alasan: {r.alasan}
              </p>
            </div>

            {isOwner && (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() =>
                    start(async () => {
                      await approveDeletion(r.id);
                      router.refresh();
                    })
                  }
                  disabled={busy}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  Setujui &amp; Hapus
                </button>
                <button
                  onClick={() =>
                    start(async () => {
                      await rejectDeletion({ requestId: r.id });
                      router.refresh();
                    })
                  }
                  disabled={busy}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Tolak
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
