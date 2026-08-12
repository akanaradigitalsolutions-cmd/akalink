"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { keluar } from "@/lib/auth-actions";
import { IconLogout, IconMenu, IconClose } from "./icons";

export function MobileNav({
  role,
  userName,
}: {
  role: string;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Tutup drawer setiap kali pindah halaman.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Kunci scroll body saat drawer terbuka.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

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

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-slate-200 bg-white px-4 py-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
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

            <SidebarNav role={role} />

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
      )}
    </>
  );
}
