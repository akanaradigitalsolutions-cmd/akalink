import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
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
  try {
    const { me, tenant } = await getTenantContext(user.id, tenantId);
    tenantName = tenant?.nama ?? tenantName;
    userName = me?.nama ?? userName;
    role = me?.role ?? role;
  } catch {
    // Biarkan nilai default; halaman menampilkan galat datanya sendiri.
  }

  return (
    <AppShell tenantName={tenantName} userName={userName} role={role}>
      {children}
    </AppShell>
  );
}
