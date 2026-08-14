"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { redeemPoints } from "@/lib/loyalty-actions";

export function PointControl({
  consumerId,
  poin,
}: {
  consumerId: string;
  poin: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [jml, setJml] = useState("");
  const [ket, setKet] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();

  function submit() {
    setMsg(undefined);
    const n = Math.floor(Number(jml));
    if (!(n > 0)) return setMsg({ text: "Jumlah poin harus lebih dari 0." });
    start(async () => {
      const res = await redeemPoints({
        consumerId,
        poin: n,
        keterangan: ket || undefined,
      });
      if (res.ok) {
        setMsg({ ok: true, text: "Poin ditukar ✓" });
        setJml("");
        setKet("");
        setOpen(false);
        router.refresh();
      } else {
        setMsg({ text: res.error });
      }
    });
  }

  if (poin <= 0) {
    return <p className="text-xs text-slate-400">Belum ada poin.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {!open ? (
        <button
          onClick={() => {
            setOpen(true);
            setMsg(undefined);
          }}
          className="w-fit rounded-lg border border-brand-400 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
        >
          Tukar Poin
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={jml}
            onChange={(e) => setJml(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            placeholder="Jumlah poin"
            className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <input
            value={ket}
            onChange={(e) => setKet(e.target.value)}
            placeholder="Ditukar dengan… (opsional)"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <button
            onClick={submit}
            disabled={pending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? "…" : "Tukar"}
          </button>
          <button
            onClick={() => setOpen(false)}
            disabled={pending}
            className="text-xs text-slate-500 hover:underline"
          >
            Batal
          </button>
        </div>
      )}
      {msg && (
        <span
          className={msg.ok ? "text-sm text-green-600" : "text-sm text-red-600"}
        >
          {msg.text}
        </span>
      )}
    </div>
  );
}
