import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { OutletSwitcher } from "./outlet-switcher";
import { MobileNav } from "./mobile-nav";
import { keluar } from "@/lib/auth-actions";
import { IconLogout } from "./icons";

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppShell({
  tenantName,
  userName,
  role,
  outlets = [],
  activeOutletId = null,
  showMember = false,
  showPromo = false,
  showBayar = false,
  children,
}: {
  tenantName: string;
  userName: string;
  role: string;
  outlets?: { id: string; nama: string }[];
  activeOutletId?: string | null;
  showMember?: boolean;
  showPromo?: boolean;
  showBayar?: boolean;
  children: React.ReactNode;
}) {
  const initials = initialsOf(userName || "?");

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-900 md:flex">
        <div className="px-2">
          <Logo size={36} subtitle={null} />
        </div>
        <SidebarNav
          role={role}
          showMember={showMember}
          showPromo={showPromo}
          showBayar={showBayar}
        />
        <form action={keluar}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <IconLogout className="h-5 w-5" />
            Keluar
          </button>
        </form>
      </aside>

      {/* Main */}
      <div className="md:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-2 border-b border-slate-200 bg-white/80 px-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:gap-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <MobileNav
              role={role}
              userName={userName}
              showMember={showMember}
              showPromo={showPromo}
              showBayar={showBayar}
            />
            <div className="shrink-0 md:hidden">
              <Logo size={30} showText={false} />
            </div>
            <div className="min-w-0">
              <p className="hidden text-xs text-slate-400 sm:block">Dashboard</p>
              <h1 className="truncate text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                {tenantName}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <OutletSwitcher
              outlets={outlets}
              activeId={activeOutletId}
              tenantName={tenantName}
            />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {userName}
              </p>
              <p className="text-xs capitalize text-slate-400">{role}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
              {initials}
            </div>
          </div>
        </header>

        <main className="overflow-x-clip px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
