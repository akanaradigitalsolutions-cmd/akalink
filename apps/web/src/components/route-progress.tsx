"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Bilah kemajuan tipis di atas layar yang muncul saat berpindah halaman.
 * Memberi umpan balik instan begitu menu/tautan diklik, lalu selesai ketika
 * halaman tujuan siap. Ringan, tanpa dependensi.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  // Mulai saat tautan internal diklik.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const a = (e.target as HTMLElement)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        a.target === "_blank" ||
        a.hasAttribute("download") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      )
        return;
      try {
        const url = new URL(a.href, location.href);
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.search === location.search) return;
      } catch {
        return;
      }
      start();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function start() {
    clearTimers();
    setVisible(true);
    setWidth(8);
    timers.current.push(setTimeout(() => setWidth(45), 90));
    timers.current.push(setTimeout(() => setWidth(70), 350));
    timers.current.push(setTimeout(() => setWidth(85), 900));
  }

  // Selesaikan saat rute berubah.
  useEffect(() => {
    if (!visible) return;
    clearTimers();
    setWidth(100);
    const t1 = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 260);
    timers.current.push(t1);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5"
      style={{ opacity: visible ? 1 : 0, transition: "opacity .2s ease" }}
    >
      <div
        className="h-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-[0_0_8px_theme(colors.brand.500)]"
        style={{ width: `${width}%`, transition: "width .3s ease" }}
      />
    </div>
  );
}
