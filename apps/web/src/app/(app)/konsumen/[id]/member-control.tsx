"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setConsumerMember } from "@/lib/members-actions";

type MType = { id: string; nama: string; diskonPersen: string };

export function MemberControl({
  consumerId,
  current,
  types,
}: {
  consumerId: string;
  current: string | null;
  types: MType[];
}) {
  const router = useRouter();
  const [sel, setSel] = useState<string>(current ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();

  function save() {
    setMsg(undefined);
    start(async () => {
      const res = await setConsumerMember({
        consumerId,
        memberTypeId: sel || null,
      });
      if (res.ok) {
        setMsg({ ok: true, text: "Tersimpan ✓" });
        router.refresh();
      } else {
        setMsg({ text: res.error });
      }
    });
  }

  if (types.length === 0) {
    return (
      <p className="text-xs text-slate-400">
        Belum ada jenis member. Owner dapat membuatnya di menu Member.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={sel}
        onChange={(e) => setSel(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        <option value="">Bukan member</option>
        {types.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nama} · diskon {Number(t.diskonPersen)}%
          </option>
        ))}
      </select>
      <button
        onClick={save}
        disabled={pending || sel === (current ?? "")}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "…" : "Simpan"}
      </button>
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
