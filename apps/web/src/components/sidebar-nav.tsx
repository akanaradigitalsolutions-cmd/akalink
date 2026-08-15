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
  IconBadge,
  IconUser,
  IconStore,
  IconBox,
  IconCoin,
  IconMachine,
  IconTruck,
  IconBuilding,
  IconSparkle,
} from "./icons";

type NavItem = {
  label: string;
  href: string;
  icon: (p: { className?: string }) => React.ReactNode;
  soon?: boolean;
  ownerOnly?: boolean;
  feature?: "member" | "promo" | "bayar" | "self" | "antar" | "b2b" | "investor" | "admin";
};

const items: NavItem[] = [
  { label: "Beranda", href: "/dashboard", icon: IconDashboard },
  { label: "Layanan", href: "/layanan", icon: IconTag, ownerOnly: true },
  { label: "Transaksi", href: "/transaksi", icon: IconReceipt },
  { label: "Konsumen", href: "/konsumen", icon: IconUsers },
  {
    label: "Member",
    href: "/member",
    icon: IconBadge,
    ownerOnly: true,
    feature: "member",
  },
  {
    label: "Promo",
    href: "/promo",
    icon: IconTag,
    ownerOnly: true,
    feature: "promo",
  },
  { label: "Inventori", href: "/inventori", icon: IconBox },
  { label: "Mesin", href: "/mesin", icon: IconMachine, feature: "self" },
  { label: "Antar-Jemput", href: "/antar-jemput", icon: IconTruck, feature: "antar" },
  { label: "B2B Korporat", href: "/b2b", icon: IconBuilding, ownerOnly: true, feature: "b2b" },
  { label: "Investor", href: "/investor", icon: IconChart, ownerOnly: true, feature: "investor" },
  { label: "Keuangan", href: "/keuangan", icon: IconWallet, ownerOnly: true },
  { label: "Laporan", href: "/laporan", icon: IconChart, ownerOnly: true },
  {
    label: "Dana Masuk",
    href: "/dana",
    icon: IconWallet,
    ownerOnly: true,
    feature: "bayar",
  },
  {
    label: "Saldo AkaLink",
    href: "/tagihan",
    icon: IconCoin,
    ownerOnly: true,
  },
  { label: "Outlet", href: "/outlet", icon: IconStore, ownerOnly: true },
  { label: "Karyawan", href: "/karyawan", icon: IconBadge, ownerOnly: true },
  {
    label: "Pengaturan",
    href: "/pengaturan",
    icon: IconSettings,
    ownerOnly: true,
  },
  { label: "Akun Saya", href: "/akun", icon: IconUser },
  { label: "Admin AkaLink", href: "/admin", icon: IconSparkle, feature: "admin" },
];

export function SidebarNav({
  role,
  showMember = false,
  showPromo = false,
  showBayar = false,
  showSelf = false,
  showAntar = false,
  showB2b = false,
  showInvestor = false,
  showAdmin = false,
}: {
  role?: string;
  showMember?: boolean;
  showPromo?: boolean;
  showBayar?: boolean;
  showSelf?: boolean;
  showAntar?: boolean;
  showB2b?: boolean;
  showInvestor?: boolean;
  showAdmin?: boolean;
}) {
  const pathname = usePathname();
  const isOwner = role === "owner";
  const featureOn: Record<string, boolean> = {
    member: showMember,
    promo: showPromo,
    bayar: showBayar,
    self: showSelf,
    antar: showAntar,
    b2b: showB2b,
    investor: showInvestor,
    admin: showAdmin,
  };

  return (
    <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
      {items
        .filter((item) => !item.ownerOnly || isOwner)
        .filter((item) => !item.feature || featureOn[item.feature])
        .map((item) => {
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
