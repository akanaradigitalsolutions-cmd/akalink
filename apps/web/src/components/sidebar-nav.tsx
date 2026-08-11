"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconTag,
  IconReceipt,
  IconUsers,
  IconWallet,
  IconChart,
  IconSettings,
} from "./icons";

type NavItem = {
  label: string;
  href: string;
  icon: (p: { className?: string }) => React.ReactNode;
  soon?: boolean;
};

const items: NavItem[] = [
  { label: "Beranda", href: "/dashboard", icon: IconDashboard },
  { label: "Layanan", href: "/layanan", icon: IconTag },
  { label: "Transaksi", href: "/transaksi", icon: IconReceipt },
  { label: "Konsumen", href: "/konsumen", icon: IconUsers },
  { label: "Keuangan", href: "/keuangan", icon: IconWallet },
  { label: "Laporan", href: "/laporan", icon: IconChart, soon: true },
  { label: "Pengaturan", href: "/pengaturan", icon: IconSettings, soon: true },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-8 flex flex-1 flex-col gap-1">
      {items.map((item) => {
        if (item.soon) {
          return (
            <span
              key={item.label}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 dark:text-slate-600"
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                Segera
              </span>
            </span>
          );
        }
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.label}
            href={item.href}
            className={
              active
                ? "flex items-center gap-3 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
                : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
