import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Hapus Akun — AkaLink",
  description:
    "Cara meminta penghapusan akun AkaLink beserta data Anda: langkah, data yang dihapus, dan yang disimpan sesuai ketentuan.",
};

// Halaman publik (tanpa login) — dibutuhkan Google Play (Delete account URL).
// URL: https://app.akalink.id/hapus-akun
export const dynamic = "force-static";

const EMAIL = "akanaradigitalsolutions@gmail.com";

function Bagian({
  judul,
  children,
}: {
  judul: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
        {judul}
      </h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {children}
      </div>
    </section>
  );
}

export default function HapusAkun() {
  const subjek = encodeURIComponent("Permintaan Hapus Akun AkaLink");
  const isi = encodeURIComponent(
    "Halo Tim AkaLink,\n\nSaya ingin menghapus akun saya beserta seluruh data.\n\n" +
      "- Email akun: \n- Nama laundry/outlet: \n\nTerima kasih.",
  );

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-400/20 blur-3xl"
      />

      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" aria-label="Beranda AkaLink">
          <Logo size={40} />
        </Link>
        <Link
          href="/masuk"
          className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:text-brand-600 dark:text-slate-300"
        >
          Masuk
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          Hapus Akun &amp; Data
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          AkaLink oleh CV Akanara Digital Solutions
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Anda berhak meminta penghapusan akun AkaLink beserta data yang
            terkait kapan saja. Halaman ini menjelaskan cara mengajukan
            permintaan, data apa yang dihapus, dan data apa yang mungkin masih
            kami simpan sesuai ketentuan hukum.
          </p>

          <Bagian judul="Cara mengajukan penghapusan">
            <p>
              Kirim email permintaan dari alamat email yang terdaftar pada akun
              Anda ke <strong>{EMAIL}</strong> dengan subjek
              &ldquo;Permintaan Hapus Akun AkaLink&rdquo;, dan sertakan:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Email akun AkaLink Anda</li>
              <li>Nama laundry / outlet Anda</li>
            </ul>
            <p>
              Kami akan memverifikasi kepemilikan akun sebelum memproses agar
              data Anda tetap aman.
            </p>
            <div className="pt-1">
              <a
                href={`mailto:${EMAIL}?subject=${subjek}&body=${isi}`}
                className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                Kirim Permintaan Hapus Akun
              </a>
            </div>
          </Bagian>

          <Bagian judul="Data yang dihapus">
            <p>
              Setelah permintaan diverifikasi, kami menghapus secara permanen:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Data akun: nama dan alamat email</li>
              <li>
                Data usaha: outlet, layanan, konsumen, karyawan, dan pengaturan
              </li>
              <li>
                Data operasional: transaksi, pembayaran, kas, dan catatan
                keuangan
              </li>
            </ul>
          </Bagian>

          <Bagian judul="Data yang disimpan sementara">
            <p>
              Sebagian data mungkin masih kami simpan dalam waktu terbatas bila
              diwajibkan oleh hukum atau untuk keperluan pembukuan dan
              pencegahan penyalahgunaan (mis. catatan transaksi untuk pajak).
              Data ini tidak digunakan untuk tujuan lain dan akan dihapus
              setelah masa penyimpanan berakhir.
            </p>
          </Bagian>

          <Bagian judul="Berapa lama prosesnya">
            <p>
              Permintaan diproses selambat-lambatnya dalam <strong>30 hari</strong>{" "}
              sejak diverifikasi. Anda akan menerima konfirmasi melalui email
              setelah penghapusan selesai.
            </p>
          </Bagian>

          <Bagian judul="Butuh bantuan?">
            <p className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">
              <strong>CV Akanara Digital Solutions</strong>
              <br />
              Email:{" "}
              <a
                href={`mailto:${EMAIL}`}
                className="font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                {EMAIL}
              </a>
            </p>
          </Bagian>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Lihat juga{" "}
          <Link
            href="/kebijakan-privasi"
            className="underline hover:text-brand-600 dark:hover:text-brand-400"
          >
            Kebijakan Privasi
          </Link>
        </p>
      </main>
    </div>
  );
}
