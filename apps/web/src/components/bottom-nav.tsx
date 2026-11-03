"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconReceipt,
  IconUsers,
  IconCash,
  IconPlus,
} from "./icons";

type Item = {
  href: string;
  label: string;
  icon: (p: { className?: string }) => React.ReactNode;
};

const LEFT: Item[] = [
  { href: "/dashboard", label: "Beranda", icon: IconDashboard },
  { href: "/transaksi", label: "Transaksi", icon: IconReceipt },
];
const RIGHT: Item[] = [
  { href: "/konsumen", label: "Konsumen", icon: IconUsers },
  { href: "/kas", label: "Kas", icon: IconCash },
];

/**
 * Navigasi bawah (mobile) bergaya kaca untuk 4 bagian tersering + tombol
 * utama "Transaksi Baru". Hanya tampil < md; menu lengkap tetap di laci
 * (hamburger) pada topbar.
 */
export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav
      className="aka-glass fixed inset-x-0 bottom-0 z-40 border-t border-[var(--glass-border)] shadow-[0_-8px_26px_-18px_rgba(15,23,42,0.4)] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigasi utama"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-2 pt-1.5 pb-1.5">
        {LEFT.map((it) => (
          <NavItem key={it.href} item={it} active={isActive(it.href)} />
        ))}

        {/* Tombol utama: Transaksi Baru */}
        <div className="flex justify-center">
          <Link
            href="/transaksi/baru"
            aria-label="Transaksi Baru"
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/30 ring-4 ring-white/70 transition active:scale-95 dark:ring-slate-900/70"
          >
            <IconPlus className="h-6 w-6" />
          </Link>
        </div>

        {RIGHT.map((it) => (
          <NavItem key={it.href} item={it} active={isActive(it.href)} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({ item, active }: { item: Item; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[11px] font-medium transition ${
        active
          ? "text-brand-700 dark:text-brand-300"
          : "text-slate-500 dark:text-slate-400"
      }`}
    >
      <item.icon className="h-[22px] w-[22px]" />
      <span className="leading-none">{item.label}</span>
    </Link>
  );
}
