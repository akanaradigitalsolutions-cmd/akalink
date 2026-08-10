import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AkaLink — Sistem Manajemen Laundry",
  description:
    "Platform SaaS manajemen laundry multi-tenant oleh Akanara Digital Solutions.",
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // lang="id" → Bahasa Indonesia sebagai bahasa utama (lihat prinsip desain §2).
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
