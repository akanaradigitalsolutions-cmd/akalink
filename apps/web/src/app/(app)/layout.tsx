import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
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
  try {
    const { me, tenant } = await getTenantContext(user.id, tenantId);
    tenantName = tenant?.nama ?? tenantName;
    userName = me?.nama ?? userName;
    role = me?.role ?? role;

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
    >
      {children}
    </AppShell>
  );
}
