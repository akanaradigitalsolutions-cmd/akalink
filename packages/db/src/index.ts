/**
 * Titik masuk paket @akalink/db.
 * Impor dari sini di seluruh aplikasi, mis:
 *   import { getDb, tenants } from "@akalink/db";
 */
export * from "./schema";
export { getDb } from "./client";
export type { Db } from "./client";
