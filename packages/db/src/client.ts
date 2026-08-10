import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/*
 * Klien database AkaLink.
 *
 * Kita memakai driver "postgres" (postgres-js) yang ringan dan cocok dengan
 * connection pooler Supabase. `prepare: false` diperlukan saat memakai pooler
 * mode "transaction" (port 6543).
 *
 * Klien dibuat secara "lazy" (hanya saat pertama dipakai) agar proses build
 * tidak gagal ketika DATABASE_URL belum tersedia.
 */
let client: ReturnType<typeof postgres> | undefined;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!dbInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL belum di-set. Salin .env.example menjadi .env dan isi nilainya.",
      );
    }
    client = postgres(connectionString, { prepare: false });
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

export type Db = ReturnType<typeof getDb>;
