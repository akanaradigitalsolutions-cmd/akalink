import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { isPlatformAdmin } from "@/lib/platform";
import {
  getAllowedOutlets,
  getActiveOutlet,
  seedDefaultOutletIfEmpty,
} from "@/lib/outlets";
import { AppShell } from "@/components/app-shell";

/**
 * Layout bersama untuk semua halaman aplikasi (setelah login).
 * Menjaga autentikasi + menyediakan kerangka (sidebar/topbar).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");

  const tenantId = getTenantIdFromUser(user);

  let tenantName = "AkaLink";
  let userName = user.email ?? "Pengguna";
  let role = "—";
  let outlets: { id: string; nama: string }[] = [];
  let activeOutletId: string | null = null;
  let showMember = false;
  let showPromo = false;
  let showBayar = false;
  let showSelf = false;
  let showAntar = false;
  let showB2b = false;
  let showInvestor = false;
  let showAdmin = false;
  try {
    const { me, tenant } = await getTenantContext(user.id, tenantId);
    tenantName = tenant?.nama ?? tenantName;
    userName = me?.nama ?? userName;
    role = me?.role ?? role;
    showMember = tenant?.fiturMember ?? false;
    showPromo = tenant?.fiturPromo ?? false;
    showBayar = tenant?.fiturBayarDigital ?? false;
    showSelf = tenant?.fiturSelfService ?? false;
    showAntar = tenant?.fiturAntarJemput ?? false;
    showB2b = tenant?.fiturB2b ?? false;
    showInvestor = tenant?.fiturInvestor ?? false;
    showAdmin = await isPlatformAdmin(user);

    if (tenantId) {
      await seedDefaultOutletIfEmpty(tenantId);
      const [list, active] = await Promise.all([
        getAllowedOutlets(tenantId),
        getActiveOutlet(tenantId),
      ]);
      outlets = list.map((o) => ({ id: o.id, nama: o.nama }));
      activeOutletId = active?.id ?? null;
    }
  } catch {
    // Biarkan nilai default; halaman menampilkan galat datanya sendiri.
  }

  return (
    <AppShell
      tenantName={tenantName}
      userName={userName}
      role={role}
      outlets={outlets}
      activeOutletId={activeOutletId}
      showMember={showMember}
      showPromo={showPromo}
      showBayar={showBayar}
      showSelf={showSelf}
      showAntar={showAntar}
      showB2b={showB2b}
      showInvestor={showInvestor}
      showAdmin={showAdmin}
    >
      {children}
    </AppShell>
  );
}
