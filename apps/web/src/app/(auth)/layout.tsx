import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* Dekorasi latar */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-brand-400/20 blur-3xl"
      />

      <Link href="/" className="mb-8">
        <Logo size={44} />
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        {children}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        © {new Date().getFullYear()} Akanara Digital Solutions
      </p>
    </div>
  );
}
