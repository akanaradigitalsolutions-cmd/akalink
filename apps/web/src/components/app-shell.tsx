import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { OutletSwitcher } from "./outlet-switcher";
import { ProfileMenu } from "./profile-menu";
import { MobileNav } from "./mobile-nav";
import { BottomNav } from "./bottom-nav";
import { RouteProgress } from "./route-progress";
import { PageFade } from "./page-fade";
import { DatePickerEnhancer } from "./date-picker-enhancer";
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
  userEmail = "",
  loginId = "",
  role,
  outlets = [],
  activeOutletId = null,
  showMember = false,
  showPromo = false,
  showBayar = false,
  showSelf = false,
  showAntar = false,
  showB2b = false,
  showInvestor = false,
  showAdmin = false,
  children,
}: {
  tenantName: string;
  userName: string;
  userEmail?: string;
  loginId?: string;
  role: string;
  outlets?: { id: string; nama: string }[];
  activeOutletId?: string | null;
  showMember?: boolean;
  showPromo?: boolean;
  showBayar?: boolean;
  showSelf?: boolean;
  showAntar?: boolean;
  showB2b?: boolean;
  showInvestor?: boolean;
  showAdmin?: boolean;
  children: React.ReactNode;
}) {
  const initials = initialsOf(userName || "?");

  return (
    <div className="aka-app-bg min-h-dvh">
      <RouteProgress />
      <DatePickerEnhancer />
      {/* Sidebar (desktop) — rel kaca ramping */}
      <aside className="aka-glass fixed inset-y-0 left-0 hidden w-64 flex-col overflow-hidden border-r border-[var(--glass-border)] px-4 py-6 shadow-[6px_0_26px_-18px_rgba(15,23,42,0.35)] md:flex">
        <div className="px-2">
          <Logo size={36} subtitle={null} />
        </div>
        <SidebarNav
          role={role}
          showMember={showMember}
          showPromo={showPromo}
          showBayar={showBayar}
          showSelf={showSelf}
          showAntar={showAntar}
          showB2b={showB2b}
          showInvestor={showInvestor}
          showAdmin={showAdmin}
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
        {/* Topbar — kaca */}
        <header className="aka-glass-strong sticky top-0 z-10 flex h-16 items-center gap-2 border-b border-[var(--glass-border)] px-3 sm:gap-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <MobileNav
              role={role}
              userName={userName}
              showMember={showMember}
              showPromo={showPromo}
              showBayar={showBayar}
              showSelf={showSelf}
              showAntar={showAntar}
              showB2b={showB2b}
              showInvestor={showInvestor}
              showAdmin={showAdmin}
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
            <ProfileMenu
              userName={userName}
              userEmail={userEmail}
              loginId={loginId}
              role={role}
              initials={initials}
            />
          </div>
        </header>

        <main
          id="aka-main"
          className="overflow-x-clip px-4 pt-6 pb-28 sm:px-6 md:pb-8 lg:px-8"
        >
          <PageFade>{children}</PageFade>
        </main>
      </div>

      {/* Navigasi bawah (mobile) */}
      <BottomNav />
    </div>
  );
}
