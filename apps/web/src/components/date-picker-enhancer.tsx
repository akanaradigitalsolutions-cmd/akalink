"use client";

import { useEffect } from "react";

/**
 * Buka date/time picker saat pengguna mengetuk di mana saja pada input
 * (bukan hanya ikon kalender). Memakai HTMLInputElement.showPicker() dalam
 * respons gesture klik. Aman: dibungkus try/catch & hanya jika didukung.
 * Dipasang sekali di shell aplikasi; tanpa dependensi tambahan.
 */
export function DatePickerEnhancer() {
  useEffect(() => {
    const TYPES = new Set(["date", "datetime-local", "month", "time", "week"]);

    function openPicker(e: Event) {
      const el = e.target as HTMLElement | null;
      if (!el || el.tagName !== "INPUT") return;
      const input = el as HTMLInputElement & { showPicker?: () => void };
      if (!TYPES.has(input.type) || input.disabled || input.readOnly) return;
      if (typeof input.showPicker !== "function") return;
      try {
        input.showPicker();
      } catch {
        /* sudah terbuka / tidak diizinkan — abaikan */
      }
    }

    // pointerup: cakup klik mouse & ketuk layar, setelah fokus berpindah.
    document.addEventListener("pointerup", openPicker);
    return () => document.removeEventListener("pointerup", openPicker);
  }, []);

  return null;
}
