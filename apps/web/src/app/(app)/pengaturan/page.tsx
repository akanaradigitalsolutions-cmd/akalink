import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getTenantSettings } from "@/lib/settings";
import { SYARAT_KETENTUAN_DEFAULT } from "@/lib/nota";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Pengaturan — AkaLink" };

export default async function PengaturanPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");

  const s = await getTenantSettings(tenantId);
  if (!s) redirect("/masuk");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Pengaturan Usaha
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Profil usaha ini tampil di nota cetak, halaman nota online, dan pesan
          WhatsApp ke pelanggan.
        </p>
      </div>

      <SettingsForm
        initial={{
          nama: s.nama,
          kota: s.kota ?? "",
          telepon: s.telepon ?? "",
          alamat: s.alamat ?? "",
          poinRupiah: s.poinRupiah ?? 0,
          fiturMember: s.fiturMember,
          fiturPoin: s.fiturPoin,
          fiturPromo: s.fiturPromo,
          fiturBayarDigital: s.fiturBayarDigital,
          bayarDigitalSetuju: s.bayarDigitalSetuju,
          syaratKetentuan:
            s.syaratKetentuan && s.syaratKetentuan.length
              ? s.syaratKetentuan
              : SYARAT_KETENTUAN_DEFAULT,
        }}
        skDefault={SYARAT_KETENTUAN_DEFAULT}
      />
    </div>
  );
}
