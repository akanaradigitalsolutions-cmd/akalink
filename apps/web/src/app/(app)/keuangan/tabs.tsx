"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/keuangan", label: "Data Akun" },
  { href: "/keuangan/saldo-awal", label: "Saldo Awal" },
  { href: "/keuangan/catat", label: "Kas & Biaya" },
  { href: "/keuangan/jurnal", label: "Jurnal" },
  { href: "/keuangan/buku-besar", label: "Buku Besar" },
  { href: "/keuangan/laba-rugi", label: "Laba-Rugi" },
  { href: "/keuangan/neraca", label: "Neraca" },
];

export function KeuanganTabs() {
  const p = usePathname();
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
      {tabs.map((t) => {
        const active = p === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={
              active
                ? "-mb-px whitespace-nowrap border-b-2 border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700 dark:text-brand-300"
                : "whitespace-nowrap px-4 py-2 text-sm text-slate-500 transition hover:text-slate-800 dark:hover:text-slate-200"
            }
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
