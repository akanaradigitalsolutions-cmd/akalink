"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { keluar } from "@/lib/auth-actions";
import { IconUser, IconSettings, IconLogout } from "./icons";

export function ProfileMenu({
  userName,
  userEmail,
  role,
  initials,
}: {
  userName: string;
  userEmail: string;
  role: string;
  initials: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isOwner = role === "owner";

  // Tutup saat klik di luar atau tekan Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full outline-none focus:ring-2 focus:ring-brand-300 sm:gap-3 sm:rounded-lg sm:px-1.5 sm:py-1 sm:hover:bg-slate-100 sm:dark:hover:bg-slate-800"
      >
        <span className="hidden text-right sm:block">
          <span className="block text-sm font-semibold text-slate-900 dark:text-white">
            {userName}
          </span>
          <span className="block text-xs capitalize text-slate-400">{role}</span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
          {initials}
        </span>
        <svg
          className={`hidden h-4 w-4 text-slate-400 transition sm:block ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
        >
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="aka-fade-in absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {/* Header identitas */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {userName}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {userEmail || "—"}
              </p>
            </div>
          </div>

          {/* Menu */}
          <div className="py-1">
            <MenuLink href="/akun" onClick={() => setOpen(false)} icon={<IconUser className="h-4 w-4" />}>
              Akun Saya
            </MenuLink>
            <MenuLink
              href="/akun#password"
              onClick={() => setOpen(false)}
              icon={<KeyIcon />}
            >
              Ganti Password
            </MenuLink>
            {isOwner && (
              <MenuLink
                href="/pengaturan"
                onClick={() => setOpen(false)}
                icon={<IconSettings className="h-4 w-4" />}
              >
                Pengaturan
              </MenuLink>
            )}
          </div>

          {/* Keluar */}
          <div className="border-t border-slate-100 py-1 dark:border-slate-800">
            <form action={keluar}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <IconLogout className="h-4 w-4" />
                Keluar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  icon,
  children,
}: {
  href: string;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      <span className="text-slate-400">{icon}</span>
      {children}
    </Link>
  );
}

function KeyIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 7a4 4 0 100 8 4 4 0 000-8zm-3.5 5L4 19.5M7 16l2 2M9.5 13.5l2 2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
