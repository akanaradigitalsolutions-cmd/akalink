import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/platform";
import { keluar } from "@/lib/auth-actions";
import { Logo } from "@/components/logo";
import { RouteProgress } from "@/components/route-progress";
import { IconLogout } from "@/components/icons";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  if (!(await isPlatformAdmin(user))) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <RouteProgress />
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
        <div className="flex items-center gap-3">
          <Logo size={30} showText={false} />
          <div>
            <p className="text-xs text-slate-400">Admin Platform</p>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">
              AkaLink Console
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ← Ke Aplikasi
          </Link>
          <form action={keluar}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <IconLogout className="h-4 w-4" />
              Keluar
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
