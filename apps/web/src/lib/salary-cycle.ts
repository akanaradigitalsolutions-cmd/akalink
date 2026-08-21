// Perhitungan siklus gaji dari tanggal mulai kerja karyawan.
// Aturan: gaji dibayar bulanan pada "hari" yang sama dengan tanggal mulai.
// Contoh: mulai 5 Agustus → gajian pertama 5 September, lalu 5 Oktober, dst.
// Hari yang tak ada di suatu bulan (mis. 31) dibulatkan ke hari terakhir bulan itu.

export type SalaryCycle = {
  tanggalMulai: string | null;
  payDay: number | null;
  nextPayDate: string | null;
  periodeMulai: string | null;
  periodeAkhir: string | null;
  daysUntil: number | null;
};

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-12
}

/** Tambah `k` bulan pada (y, m1-12, day) dengan pembulatan hari akhir bulan. */
function addMonths(y: number, m: number, day: number, k: number): string {
  const total = y * 12 + (m - 1) + k;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const nd = Math.min(day, lastDayOfMonth(ny, nm));
  return ymd(ny, nm, nd);
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const ta = Date.UTC(ay, am - 1, ad);
  const tb = Date.UTC(by, bm - 1, bd);
  return Math.round((tb - ta) / 86400000);
}

function addDays(s: string, n: number): string {
  const [y, m, d] = s.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + n * 86400000;
  const dt = new Date(t);
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** Periode gaji untuk suatu tanggal bayar: (tgl bayar − 1 bulan) s/d (tgl bayar − 1 hari). */
export function periodeForPayDate(tanggalBayar: string): {
  mulai: string;
  akhir: string;
} {
  const s = tanggalBayar.slice(0, 10);
  const [y, m, d] = s.split("-").map(Number);
  return { mulai: addMonths(y, m, d, -1), akhir: addDays(s, -1) };
}

export function salaryCycle(
  tanggalMulai: string | null,
  today: string,
): SalaryCycle {
  if (!tanggalMulai) {
    return {
      tanggalMulai: null,
      payDay: null,
      nextPayDate: null,
      periodeMulai: null,
      periodeAkhir: null,
      daysUntil: null,
    };
  }
  const start = tanggalMulai.slice(0, 10);
  const [sy, sm, sd] = start.split("-").map(Number);
  const payDay = sd;

  // Cari gajian berikutnya (>= hari ini). Gajian ke-k = start + k bulan.
  let k = 1;
  let nextPayDate = addMonths(sy, sm, payDay, k);
  while (nextPayDate < today) {
    k += 1;
    nextPayDate = addMonths(sy, sm, payDay, k);
  }
  // Periode = dari gajian sebelumnya (atau tanggal mulai) s/d sehari sebelum berikutnya.
  const periodeMulai = k - 1 === 0 ? start : addMonths(sy, sm, payDay, k - 1);
  const periodeAkhir = addDays(nextPayDate, -1);

  return {
    tanggalMulai: start,
    payDay,
    nextPayDate,
    periodeMulai,
    periodeAkhir,
    daysUntil: daysBetween(today, nextPayDate),
  };
}
