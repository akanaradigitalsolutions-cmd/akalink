"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { keluar } from "@/lib/auth-actions";
import { IconLogout, IconMenu, IconClose } from "./icons";

export function MobileNav({
  role,
  userName,
  showMember = false,
  showPromo = false,
  showBayar = false,
  showSelf = false,
  showAntar = false,
}: {
  role: string;
  userName: string;
  showMember?: boolean;
  showPromo?: boolean;
  showBayar?: boolean;
  showSelf?: boolean;
  showAntar?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  // Tutup drawer setiap kali pindah halaman.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Kunci scroll body saat drawer terbuka.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Drawer dirender lewat portal ke <body> agar keluar dari header yang
  // ber-backdrop-blur (backdrop-filter membuat position:fixed terkurung).
  const drawer = (
    <div className="fixed inset-0 z-[100] md:hidden">
      <button
        aria-label="Tutup menu"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-slate-900/60"
      />
      <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col overflow-y-auto border-r border-slate-200 bg-white px-4 py-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <Logo size={34} subtitle={null} />
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <SidebarNav
          role={role}
          showMember={showMember}
          showPromo={showPromo}
          showBayar={showBayar}
          showSelf={showSelf}
          showAntar={showAntar}
        />

        <div className="mt-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <p className="px-3 pb-2 text-xs text-slate-400">
            Masuk sebagai{" "}
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {userName}
            </span>
          </p>
          <form action={keluar}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <IconLogout className="h-5 w-5" />
              Keluar
            </button>
          </form>
        </div>
      </aside>
    </div>
  );

  return (
    <>
      <button
        type="button"
        aria-label="Buka menu"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
      >
        <IconMenu className="h-5 w-5" />
      </button>

      {mounted && open ? createPortal(drawer, document.body) : null}
    </>
  );
}
