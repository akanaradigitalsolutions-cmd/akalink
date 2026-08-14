/**
 * Ketentuan biaya pembayaran digital AkaLink (platform).
 * NILAI INI DITETAPKAN PLATFORM — tidak dapat diubah oleh laundry.
 */

// Biaya proses per transaksi (MDR), dipotong dari tiap pembayaran konsumen.
export const PG_ADMIN_PERSEN = 3.5;

// Biaya transfer/penarikan ke rekening bank, dikenakan saat withdraw.
export const WITHDRAW_FEE = 5000;

// Minimum satu kali penarikan.
export const MIN_WITHDRAW = 50_000;
