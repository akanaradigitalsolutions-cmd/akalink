"use client";

import { usePathname } from "next/navigation";

/**
 * Membungkus isi halaman dengan animasi fade lembut setiap kali rute berubah,
 * sehingga peralihan antar-halaman terasa mulus (bukan "melompat").
 */
export function PageFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="aka-fade-in">
      {children}
    </div>
  );
}
