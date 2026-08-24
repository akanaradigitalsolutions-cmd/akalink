"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfil } from "@/lib/account-actions";

export function ProfilForm({ nama: namaAwal }: { nama: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [nama, setNama] = useState(namaAwal);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();

  const input =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

  function simpan() {
    setMsg(undefined);
    if (nama.trim().length < 2) return setMsg({ text: "Nama minimal 2 karakter." });
    start(async () => {
      const res = await updateProfil({ nama });
      if (res.ok) {
        setMsg({ ok: true, text: "Profil tersimpan ✓" });
        router.refresh();
      } else setMsg({ text: res.error });
    });
  }

  const berubah = nama.trim() !== namaAwal.trim();

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs text-slate-500">
        Nama
        <input
          value={nama}
          onChange={(e) => {
            setNama(e.target.value);
            setMsg(undefined);
          }}
          className={`${input} mt-1`}
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          onClick={simpan}
          disabled={pending || !berubah}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Menyimpan…" : "Simpan Profil"}
        </button>
        {msg && (
          <span className={msg.ok ? "text-sm text-green-600" : "text-sm text-red-600"}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
