/**
 * Taksonomi Pengeluaran (biaya) laundry — berdasarkan daftar baku:
 *   Kelompok Akun → Kategori → Produk/Item.
 *
 * Dimodelkan memakai Chart of Accounts yang sudah ada (tanpa perubahan skema):
 *  - Setiap Kelompok Akun = 1 akun COA (induk). Umumnya tipe "beban"; khusus
 *    "Biaya Dibayar dimuka" bertipe "aset" (muncul di Neraca).
 *  - Setiap Kategori = 1 akun COA (anak dari Kelompok Akun). Entri pengeluaran
 *    diposting ke akun Kategori ini → otomatis muncul di Laba-Rugi/Neraca.
 *  - Produk/Item = pilihan baku pada form; disimpan di keterangan jurnal dan
 *    dirinci pada laporan "Rincian Biaya".
 *
 * Kode akun memakai rentang khusus agar tidak bentrok dengan COA default:
 *  - Beban terperinci: 5.50 – 5.69 (anak: 5.5x.NN)
 *  - Aset dibayar dimuka: 1.5 (anak: 1.5.NN)
 */

export type ExpenseKategoriSeed = {
  kode: string;
  nama: string;
  produk: string[];
};

export type ExpenseGroupSeed = {
  kode: string;
  nama: string;
  tipe: "beban" | "aset";
  kategori: ExpenseKategoriSeed[];
};

export const EXPENSE_TAXONOMY: ExpenseGroupSeed[] = [
  {
    kode: "5.50",
    nama: "Biaya Produksi / Bahan Baku",
    tipe: "beban",
    kategori: [
      {
        kode: "5.50.01",
        nama: "Chemical",
        produk: [
          "Deterjen laundry",
          "Deterjen dry/wet clean",
          "Deterjen sepatu",
          "Deterjen karpet",
          "Deterjen sofa/springbed",
          "Parfum laundry",
          "Parfum dry/wet clean",
          "Parfum karpet",
          "Chemical spotting/noda khusus",
          "Pemutih",
          "Methanol",
          "Softener laundry",
          "Softener dry clean",
          "Cairan Disinfectan",
          "Cat Sepatu/Tas",
          "Plastik Packing Sepatu",
          "Plastik Packing Tas",
          "Lain-lain",
        ],
      },
      {
        kode: "5.50.02",
        nama: "Pengemasan",
        produk: [
          "Plastik kemas laundry",
          "Plastik kemas dry/wet clean",
          "Plastik kemas karpet",
          "Plastik wrap kemas sofa/springbed",
          "Tas/kresek/paper bag",
          "Silica gel",
          "Label marker dry/wet clean",
          "Tag/label cuci",
          "Hanger dry/wet clean",
          "Isolatip",
          "Penjepit celana",
          "Penyangga kerah baju",
          "Penjepit kemeja/buaya",
          "Karton kemeja",
          "Plastik Kemas Sepatu",
          "Plastik Kemas Tas",
          "Lain-lain",
        ],
      },
      {
        kode: "5.50.03",
        nama: "Energi",
        produk: [
          "Listrik",
          "LPG/Gas Alam",
          "Solar",
          "Minyak tanah",
          "Bensin",
          "Air",
          "LPG Pengering",
          "LPG Setrika Uap",
        ],
      },
      {
        kode: "5.50.04",
        nama: "Peralatan Pembantu",
        produk: [
          "Tug gun",
          "Hanger jemur",
          "Keranjang pakaian",
          "Tas pakaian kotor",
          "Alat semprot parfum",
          "Isi striples",
          "Benang",
          "Jarum",
          "Sikat pembersih",
          "Spoting drop",
          "Lap Microfiber",
          "Sarung tangan latex/plastik",
          "Alat Fogging",
          "Alat cuci karpet",
          "Lain-lain",
        ],
      },
      {
        kode: "5.50.05",
        nama: "Biaya Vendor",
        produk: ["Biaya Makelar", "Biaya Rekanan"],
      },
    ],
  },
  {
    kode: "5.51",
    nama: "Biaya Kantor",
    tipe: "beban",
    kategori: [
      {
        kode: "5.51.01",
        nama: "Biaya Kantor",
        produk: [
          "kertas struk/nota",
          "Pulpen/spidol",
          "Tinta",
          "Kertas/buku",
          "Pengharum ruangan",
          "Internet",
          "Telepon/sms",
          "Pembersih lantai",
          "Pembersih perabot kantor",
          "Iuran keamanan",
          "Iuran kebersihan",
          "Galon Air Mineral",
          "Iuran TV Kabel",
          "Biaya Transportasi",
          "Biaya Makan Karyawan",
          "Biaya kesehatan karyawan",
          "Biaya Asuransi Mesin",
          "Biaya Asuransi Gedung",
          "Sumbangan",
          "Angsuran Kredit",
          "Lain-lain",
        ],
      },
    ],
  },
  {
    kode: "5.52",
    nama: "Gaji Karyawan",
    tipe: "beban",
    kategori: [
      {
        kode: "5.52.01",
        nama: "Biaya Gaji",
        produk: ["Pegawai tetap", "Pegawai lepas/panggilan"],
      },
      {
        kode: "5.52.02",
        nama: "Partner/vendor",
        produk: ["Partner/vendor"],
      },
    ],
  },
  {
    kode: "5.53",
    nama: "Biaya Service",
    tipe: "beban",
    kategori: [
      {
        kode: "5.53.01",
        nama: "Biaya Service",
        produk: [
          "Mesin cuci",
          "Mesin pengering",
          "Setrika",
          "AC",
          "Pompa air",
          "Kendaraan",
          "Mesin kasir",
          "Instalasi listrik",
          "Perawatan mesin lainnya",
        ],
      },
    ],
  },
  {
    kode: "5.54",
    nama: "Biaya Pemasaran Digital",
    tipe: "beban",
    kategori: [
      {
        kode: "5.54.01",
        nama: "Biaya Pemasaran Digital",
        produk: ["Endorse", "Facebook ads", "Google ads", "Instagram ads"],
      },
    ],
  },
  {
    kode: "5.55",
    nama: "Biaya Pemasaran Konvensional",
    tipe: "beban",
    kategori: [
      {
        kode: "5.55.01",
        nama: "Biaya Pemasaran Konvensional",
        produk: [
          "Iklan koran",
          "Brosur",
          "Baliho",
          "Banner pinggir jalan",
          "Pajak reklame/papan nama",
          "Hadiah Undian",
        ],
      },
    ],
  },
  {
    kode: "5.56",
    nama: "Biaya Sewa Bangunan",
    tipe: "beban",
    kategori: [
      {
        kode: "5.56.01",
        nama: "Sewa Bangunan",
        produk: ["Sewa Ruko", "Sewa Tempat Produksi", "Sewa Kios"],
      },
    ],
  },
  {
    kode: "5.57",
    nama: "Biaya Sewa Peralatan",
    tipe: "beban",
    kategori: [
      {
        kode: "5.57.01",
        nama: "Sewa Peralatan",
        produk: ["Sewa Kendaraan", "Sewa Peralatan Kerja"],
      },
    ],
  },
  {
    kode: "5.58",
    nama: "Biaya Depresiasi",
    tipe: "beban",
    kategori: [
      {
        kode: "5.58.01",
        nama: "Biaya Depresiasi",
        produk: ["Mesin produksi", "Peralatan kantor", "Kendaraan transportasi"],
      },
    ],
  },
  {
    kode: "5.59",
    nama: "Biaya Kerugian",
    tipe: "beban",
    kategori: [
      {
        kode: "5.59.01",
        nama: "Produksi Tak Terduga",
        produk: ["Barang Rusak (Produksi)", "Barang Hilang (Produksi)"],
      },
      {
        kode: "5.59.02",
        nama: "Transaksi Tak Terduga",
        produk: [
          "Barang Rusak (Transaksi)",
          "Barang Hilang (Transaksi)",
          "Refund Sisa Epayment / Deposit",
        ],
      },
    ],
  },
  {
    kode: "5.60",
    nama: "Biaya Barang Dagang",
    tipe: "beban",
    kategori: [
      {
        kode: "5.60.01",
        nama: "Barang Dagang Lain - Lain",
        produk: ["Barang Dagang Lain - Lain"],
      },
      {
        kode: "5.60.02",
        nama: "Makanan Dan Minuman",
        produk: ["Makanan Dan Minuman"],
      },
    ],
  },
  {
    kode: "5.61",
    nama: "Biaya Koin Aplikasi",
    tipe: "beban",
    kategori: [
      {
        kode: "5.61.01",
        nama: "Biaya Koin Aplikasi",
        produk: ["SMS", "Whatsapp", "M-Koin AkaLink"],
      },
      {
        kode: "5.61.02",
        nama: "Biaya Aktivasi Outlet AkaLink",
        produk: ["Biaya Aktivasi Outlet AkaLink"],
      },
    ],
  },
  {
    kode: "5.62",
    nama: "Biaya Penggunaan Koin AkaLink",
    tipe: "beban",
    kategori: [
      {
        kode: "5.62.01",
        nama: "Biaya Penggunaan Koin AkaLink",
        produk: ["Biaya Koin AkaLink Otomatis"],
      },
      {
        kode: "5.62.02",
        nama: "Biaya Pendampingan Omnichannel",
        produk: ["Biaya Pendampingan Omnichannel"],
      },
    ],
  },
  {
    kode: "5.63",
    nama: "Biaya Digital Lain (Refund Salah Transfer E-wallet)",
    tipe: "beban",
    kategori: [
      {
        kode: "5.63.01",
        nama: "Biaya Refund Qris/Paylink salah transfer",
        produk: ["Biaya Refund Qris/Paylink salah transfer"],
      },
    ],
  },
  {
    kode: "5.64",
    nama: "Biaya Tarik Tunai Paylink (Withdrawal)",
    tipe: "beban",
    kategori: [
      {
        kode: "5.64.01",
        nama: "Biaya Tarik Tunai Paylink (Withdrawal)",
        produk: ["Biaya Tarik Tunai Paylink (Withdrawal)"],
      },
    ],
  },
  {
    kode: "5.65",
    nama: "Biaya MDR EDC",
    tipe: "beban",
    kategori: [
      { kode: "5.65.01", nama: "Biaya MDR EDC", produk: ["Biaya MDR EDC"] },
    ],
  },
  {
    kode: "5.66",
    nama: "Biaya Pembayaran Pajak",
    tipe: "beban",
    kategori: [
      {
        kode: "5.66.01",
        nama: "Biaya Pembayaran Pajak",
        produk: ["Biaya Pembayaran Pajak"],
      },
    ],
  },
  {
    kode: "5.67",
    nama: "Biaya Admin Bank",
    tipe: "beban",
    kategori: [
      { kode: "5.67.01", nama: "Admin Bank", produk: ["Biaya Admin Bank"] },
    ],
  },
  {
    kode: "5.68",
    nama: "Biaya Pembayaran Digital",
    tipe: "beban",
    kategori: [
      {
        kode: "5.68.01",
        nama: "Biaya pembayaran Digital - QRIS",
        produk: ["Biaya pembayaran Digital - QRIS"],
      },
    ],
  },
  {
    kode: "5.69",
    nama: "Biaya Renovasi Gedung",
    tipe: "beban",
    kategori: [
      { kode: "5.69.01", nama: "Renovasi Gedung", produk: ["Renovasi Gedung"] },
    ],
  },
  {
    kode: "1.5",
    nama: "Biaya Dibayar Dimuka",
    tipe: "aset",
    kategori: [
      {
        kode: "1.5.01",
        nama: "Biaya Dibayar Dimuka",
        produk: [
          "Biaya LPG dibayar dimuka",
          "Biaya Listrik dibayar dimuka",
          "Biaya Deterjen dibayar dimuka",
          "Biaya Air dibayar dimuka",
        ],
      },
    ],
  },
];

/** Semua kode akun Kelompok (induk) taksonomi ini. */
export const EXPENSE_GROUP_KODES = EXPENSE_TAXONOMY.map((g) => g.kode);

/** Kode akun induk BEBAN (5) & ASET (1) dari COA default, sebagai parent. */
export const EXPENSE_ROOT_BEBAN = "5";
export const EXPENSE_ROOT_ASET = "1";

/** Peta nama-kategori (lowercase) → daftar produk baku (untuk owner-added kategori tetap boleh ketik bebas). */
export function produkByKategoriNama(nama: string): string[] {
  const key = nama.trim().toLowerCase();
  for (const g of EXPENSE_TAXONOMY) {
    for (const k of g.kategori) {
      if (k.nama.trim().toLowerCase() === key) return k.produk;
    }
  }
  return [];
}

/** Nama Kelompok Akun berdasarkan kode induknya (mis. "5.50" → "Biaya Produksi / Bahan Baku"). */
export function groupNamaByKode(kode: string): string | undefined {
  return EXPENSE_TAXONOMY.find((g) => g.kode === kode)?.nama;
}

/** Semua akun (induk + kategori) yang perlu di-seed untuk sebuah tenant. */
export function expenseCoaSeeds(): {
  kode: string;
  nama: string;
  tipe: "beban" | "aset";
  parentKode: string;
}[] {
  const out: {
    kode: string;
    nama: string;
    tipe: "beban" | "aset";
    parentKode: string;
  }[] = [];
  for (const g of EXPENSE_TAXONOMY) {
    out.push({
      kode: g.kode,
      nama: g.nama,
      tipe: g.tipe,
      parentKode: g.tipe === "aset" ? EXPENSE_ROOT_ASET : EXPENSE_ROOT_BEBAN,
    });
    for (const k of g.kategori) {
      out.push({ kode: k.kode, nama: k.nama, tipe: g.tipe, parentKode: g.kode });
    }
  }
  return out;
}
