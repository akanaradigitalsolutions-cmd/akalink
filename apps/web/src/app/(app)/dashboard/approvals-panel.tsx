"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { approveApproval, rejectApproval } from "@/lib/approval-actions";
import type { ApprovalRow } from "@/lib/approvals";

export function ApprovalsPanel({
  approvals,
  isOwner,
}: {
  approvals: ApprovalRow[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();

  return (
    <section className="rounded-2xl border border-blue-300 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/30">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-200 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
          📝
        </span>
        <div>
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
            {isOwner
              ? `Permintaan Persetujuan (${approvals.length})`
              : `Menunggu Persetujuan (${approvals.length})`}
          </h3>
          <p className="text-xs text-blue-700/90 dark:text-blue-400/90">
            {isOwner
              ? "Aksi staf yang perlu persetujuan Anda (mis. pembelian stok)."
              : "Permintaan Anda menunggu persetujuan pemilik."}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col divide-y divide-blue-200/70 dark:divide-blue-900/50">
        {approvals.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {a.judul}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {a.nominal > 0 ? `${formatRupiah(a.nominal)} · ` : ""}
                oleh {a.requestedByNama ?? "Staf"} · {formatDateTime(a.createdAt)}
              </p>
            </div>
            {isOwner && (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() =>
                    start(async () => {
                      await approveApproval(a.id);
                      router.refresh();
                    })
                  }
                  disabled={busy}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                >
                  Setujui
                </button>
                <button
                  onClick={() =>
                    start(async () => {
                      await rejectApproval({ id: a.id });
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
