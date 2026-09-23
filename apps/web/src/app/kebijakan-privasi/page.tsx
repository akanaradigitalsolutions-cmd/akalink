import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — AkaLink",
  description:
    "Kebijakan privasi aplikasi AkaLink oleh CV Akanara Digital Solutions: data yang kami kumpulkan, cara penggunaan, dan hak Anda.",
};

// Halaman publik (tanpa login) — dibutuhkan untuk listing Google Play.
// URL: https://app.akalink.id/kebijakan-privasi
export const dynamic = "force-static";

const TERAKHIR_DIPERBARUI = "23 September 2025";

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

export default function KebijakanPrivasi() {
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
          Kebijakan Privasi
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Terakhir diperbarui: {TERAKHIR_DIPERBARUI}
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            AkaLink (&ldquo;Aplikasi&rdquo;) adalah platform manajemen laundry
            yang dikelola oleh <strong>CV Akanara Digital Solutions</strong>
            {" "}(&ldquo;kami&rdquo;). Kebijakan Privasi ini menjelaskan data
            apa yang kami kumpulkan saat Anda menggunakan Aplikasi, bagaimana
            kami menggunakannya, dan hak Anda atas data tersebut. Dengan
            menggunakan AkaLink, Anda menyetujui praktik yang dijelaskan di
            halaman ini.
          </p>

          <Bagian judul="1. Data yang Kami Kumpulkan">
            <p>Kami mengumpulkan data berikut untuk menjalankan layanan:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Data akun:</strong> nama, alamat email, dan kata sandi
                (tersimpan dalam bentuk terenkripsi) yang Anda daftarkan.
              </li>
              <li>
                <strong>Data usaha:</strong> nama outlet, layanan, harga,
                karyawan, dan pengaturan bisnis yang Anda masukkan.
              </li>
              <li>
                <strong>Data operasional:</strong> transaksi, konsumen,
                pembayaran, kas, dan catatan keuangan yang Anda buat di dalam
                Aplikasi.
              </li>
              <li>
                <strong>Data teknis:</strong> alamat IP, jenis perangkat, dan
                log aktivitas dasar untuk keamanan dan pemecahan masalah.
              </li>
            </ul>
            <p>
              Kami <strong>tidak</strong> mengumpulkan lokasi presisi,
              kontak, foto, atau data sensitif lain dari perangkat Anda.
            </p>
          </Bagian>

          <Bagian judul="2. Cara Kami Menggunakan Data">
            <ul className="list-disc space-y-1 pl-5">
              <li>Menyediakan dan mengoperasikan fitur Aplikasi.</li>
              <li>
                Menyimpan dan menampilkan data usaha Anda (transaksi, laporan
                keuangan, dsb.).
              </li>
              <li>Mengamankan akun dan mencegah penyalahgunaan.</li>
              <li>Memberikan dukungan teknis saat Anda membutuhkannya.</li>
            </ul>
            <p>
              Kami tidak menjual data Anda dan tidak menggunakannya untuk iklan
              pihak ketiga.
            </p>
          </Bagian>

          <Bagian judul="3. Penyimpanan & Keamanan Data">
            <p>
              Data Anda disimpan pada infrastruktur berbasis cloud yang
              terlindungi. Setiap penyewa (tenant) diisolasi sehingga data satu
              usaha tidak dapat diakses oleh usaha lain. Kata sandi disimpan
              dalam bentuk hash, dan koneksi ke Aplikasi menggunakan enkripsi
              HTTPS. Kami juga melakukan pencadangan (backup) berkala untuk
              mencegah kehilangan data.
            </p>
          </Bagian>

          <Bagian judul="4. Berbagi Data dengan Pihak Ketiga">
            <p>
              Kami hanya membagikan data seperlunya kepada penyedia layanan
              yang mendukung operasi Aplikasi, yaitu:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Penyedia basis data &amp; autentikasi (Supabase):</strong>{" "}
                untuk menyimpan data dan mengelola login.
              </li>
              <li>
                <strong>Penyedia pembayaran (DOKU):</strong> untuk memproses
                pembayaran saldo/tagihan bila Anda menggunakannya.
              </li>
            </ul>
            <p>
              Kami tidak membagikan data Anda kepada pihak lain kecuali
              diwajibkan oleh hukum yang berlaku.
            </p>
          </Bagian>

          <Bagian judul="5. Penyimpanan Selama Diperlukan">
            <p>
              Kami menyimpan data Anda selama akun aktif. Jika Anda meminta
              penghapusan akun, kami akan menghapus data pribadi Anda dalam
              waktu wajar, kecuali data yang wajib disimpan untuk kepatuhan
              hukum atau pembukuan.
            </p>
          </Bagian>

          <Bagian judul="6. Hak Anda">
            <ul className="list-disc space-y-1 pl-5">
              <li>Mengakses dan memperbarui data akun Anda kapan saja.</li>
              <li>Meminta penghapusan akun beserta data pribadi Anda.</li>
              <li>Meminta salinan data usaha Anda.</li>
            </ul>
            <p>
              Untuk menggunakan hak-hak ini, hubungi kami melalui kontak di
              bawah.
            </p>
          </Bagian>

          <Bagian judul="7. Anak di Bawah Umur">
            <p>
              Aplikasi ini ditujukan untuk pelaku usaha dan tidak diperuntukkan
              bagi anak di bawah umur 13 tahun. Kami tidak dengan sengaja
              mengumpulkan data dari anak-anak.
            </p>
          </Bagian>

          <Bagian judul="8. Perubahan Kebijakan">
            <p>
              Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu.
              Perubahan akan diumumkan di halaman ini dengan tanggal
              &ldquo;Terakhir diperbarui&rdquo; yang baru.
            </p>
          </Bagian>

          <Bagian judul="9. Hubungi Kami">
            <p>
              Jika ada pertanyaan mengenai Kebijakan Privasi ini atau data
              Anda, silakan hubungi:
            </p>
            <p className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">
              <strong>CV Akanara Digital Solutions</strong>
              <br />
              Email:{" "}
              <a
                href="mailto:akanaradigitalsolutions@gmail.com"
                className="font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                akanaradigitalsolutions@gmail.com
              </a>
            </p>
          </Bagian>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} CV Akanara Digital Solutions — AkaLink
        </p>
      </main>
    </div>
  );
}
