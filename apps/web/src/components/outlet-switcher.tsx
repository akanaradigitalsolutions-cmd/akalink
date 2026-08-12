"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveOutlet } from "@/lib/outlets-actions";

type Outlet = { id: string; nama: string };

export function OutletSwitcher({
  outlets,
  activeId,
}: {
  outlets: Outlet[];
  activeId: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (outlets.length === 0) return null;

  // Satu outlet: cukup tampilkan namanya (tanpa dropdown).
  if (outlets.length === 1) {
    return (
      <span className="hidden max-w-[160px] truncate rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:inline-block">
        🏪 {outlets[0].nama}
      </span>
    );
  }

  return (
    <select
      value={activeId ?? outlets[0].id}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await setActiveOutlet({ id: e.target.value });
          router.refresh();
        })
      }
      aria-label="Pilih outlet aktif"
      className="max-w-[180px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
    >
      {outlets.map((o) => (
        <option key={o.id} value={o.id}>
          🏪 {o.nama}
        </option>
      ))}
    </select>
  );
}
