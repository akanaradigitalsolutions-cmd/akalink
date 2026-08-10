import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Konfigurasi Drizzle Kit — alat untuk membuat & menjalankan migrasi.
 *
 * - `generate` : membaca src/schema.ts → membuat file SQL migrasi (tidak butuh koneksi DB).
 * - `migrate`  : menjalankan file SQL migrasi ke database (butuh DATABASE_URL).
 * - `studio`   : membuka penjelajah database di browser (butuh DATABASE_URL).
 */
export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Hanya dipakai oleh migrate/push/studio. `generate` tidak memerlukannya.
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
