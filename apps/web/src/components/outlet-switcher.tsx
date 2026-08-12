"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { setActiveOutlet } from "@/lib/outlets-actions";

type Outlet = { id: string; nama: string };

/** Buang awalan nama tenant dari nama outlet agar ringkas di header. */
function shortName(nama: string, tenant?: string): string {
  if (!tenant) return nama;
  const low = nama.toLowerCase();
  const t = tenant.toLowerCase();
  if (low.startsWith(t)) {
    const rest = nama.slice(tenant.length).replace(/^[\s—–-]+/, "").trim();
    if (rest) return rest;
  }
  return nama;
}

export function OutletSwitcher({
  outlets,
  activeId,
  tenantName,
}: {
  outlets: Outlet[];
  activeId: string | null;
  tenantName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  if (outlets.length === 0) return null;
  // Halaman Laporan punya pemilih outlet sendiri (dengan opsi "Semua Outlet"),
  // jadi sembunyikan switcher topbar di sana agar tidak ada dua kontrol.
  if (pathname.startsWith("/laporan")) return null;

  // Satu outlet: cukup tampilkan namanya (tanpa dropdown).
  if (outlets.length === 1) {
    return (
      <span className="hidden max-w-[160px] truncate rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:inline-block">
        🏪 {shortName(outlets[0].nama, tenantName)}
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
      className="max-w-[40vw] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:opacity-60 sm:max-w-[200px] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
    >
      {outlets.map((o) => (
        <option key={o.id} value={o.id}>
          🏪 {shortName(o.nama, tenantName)}
        </option>
      ))}
    </select>
  );
}
