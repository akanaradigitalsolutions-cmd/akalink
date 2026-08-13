import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/*
 * ============================================================================
 *  SKEMA DATABASE AKALINK — Phase 0 (Fondasi)
 * ----------------------------------------------------------------------------
 *  File ini mendefinisikan "tabel" database dalam TypeScript. Drizzle akan
 *  menerjemahkannya menjadi perintah SQL (lihat folder migrations/).
 *
 *  Aturan multi-tenant: hampir semua tabel bisnis punya kolom `tenant_id`
 *  agar data setiap laundry terisolasi. Keamanan barisnya (RLS) ditambahkan
 *  pada Phase 0.4.
 * ============================================================================
 */

// --- Enum: himpunan nilai tetap yang diizinkan untuk sebuah kolom ---------
export const tenantTierEnum = pgEnum("tenant_tier", [
  "basic",
  "premium",
  "power",
]);

export const tenantStatusEnum = pgEnum("tenant_status", [
  "trial",
  "active",
  "suspended",
]);

export const employeeStatusEnum = pgEnum("employee_status", [
  "invited",
  "active",
  "inactive",
]);

// --- tenants: satu baris = satu bisnis laundry (pelanggan platform) --------
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  nama: text("nama").notNull(),
  kota: text("kota"),
  telepon: text("telepon"),
  alamat: text("alamat"),
  // Daftar poin syarat & ketentuan yang tampil di nota (array string).
  syaratKetentuan: jsonb("syarat_ketentuan").$type<string[]>(),
  tier: tenantTierEnum("tier").notNull().default("basic"),
  status: tenantStatusEnum("status").notNull().default("trial"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- outlets: cabang / gerai milik sebuah tenant --------------------------
export const outlets = pgTable(
  "outlets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    nama: text("nama").notNull(),
    telepon: text("telepon"),
    kota: text("kota"),
    alamat: text("alamat"),
    logoUrl: text("logo_url"),
    // jam_operasional disimpan sebagai JSON, mis. { "senin": "08:00-20:00" }
    jamOperasional: jsonb("jam_operasional"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("outlets_tenant_id_idx").on(t.tenantId)],
);

// --- access_levels: level akses / peran (bawaan + kustom) per tenant ------
export const accessLevels = pgTable(
  "access_levels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    nama: text("nama").notNull(),
    deskripsi: text("deskripsi"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("access_levels_tenant_id_idx").on(t.tenantId)],
);

// --- permissions: izin granular (mis. "transaksi.buat") per access_level --
export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accessLevelId: uuid("access_level_id")
      .notNull()
      .references(() => accessLevels.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
  },
  (t) => [
    unique("permissions_level_key_unique").on(t.accessLevelId, t.key),
    index("permissions_access_level_id_idx").on(t.accessLevelId),
  ],
);

// --- employees: karyawan milik tenant, terhubung ke Supabase Auth ---------
export const employees = pgTable(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    // id user di Supabase Auth (auth.users). Null saat masih "diundang".
    authUserId: uuid("auth_user_id"),
    nama: text("nama").notNull(),
    email: text("email"),
    employeeCode: text("employee_code"),
    role: text("role").notNull().default("kasir"),
    // Daftar outlet yang boleh diakses karyawan ini (scope outlet).
    outletIds: uuid("outlet_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    status: employeeStatusEnum("status").notNull().default("invited"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("employees_tenant_id_idx").on(t.tenantId),
    index("employees_auth_user_id_idx").on(t.authUserId),
    unique("employees_tenant_code_unique").on(t.tenantId, t.employeeCode),
  ],
);

/*
 * ---- Relasi ----------------------------------------------------------------
 * Relasi TIDAK membuat kolom baru. Mereka memberi tahu Drizzle cara
 * menggabungkan tabel saat query (mis. "ambil tenant beserta semua outlet-nya").
 */
export const tenantsRelations = relations(tenants, ({ many }) => ({
  outlets: many(outlets),
  employees: many(employees),
  accessLevels: many(accessLevels),
  services: many(services),
  consumers: many(consumers),
}));

export const outletsRelations = relations(outlets, ({ one }) => ({
  tenant: one(tenants, {
    fields: [outlets.tenantId],
    references: [tenants.id],
  }),
}));

export const employeesRelations = relations(employees, ({ one }) => ({
  tenant: one(tenants, {
    fields: [employees.tenantId],
    references: [tenants.id],
  }),
}));

export const accessLevelsRelations = relations(
  accessLevels,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [accessLevels.tenantId],
      references: [tenants.id],
    }),
    permissions: many(permissions),
  }),
);

export const permissionsRelations = relations(permissions, ({ one }) => ({
  accessLevel: one(accessLevels, {
    fields: [permissions.accessLevelId],
    references: [accessLevels.id],
  }),
}));

// --- services: katalog layanan laundry (Phase 1) --------------------------
export const serviceUnitEnum = pgEnum("service_unit", [
  "kiloan", // per kilogram (KG)
  "satuan", // per item
  "koin", // koin / load
  "luas", // per meter persegi (M2)
]);

// Satuan waktu untuk estimasi selesai: jam atau hari.
export const estimasiUnitEnum = pgEnum("estimasi_unit", ["jam", "hari"]);

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    // Null = layanan berlaku untuk semua outlet (MVP satu outlet).
    outletId: uuid("outlet_id").references(() => outlets.id, {
      onDelete: "set null",
    }),
    nama: text("nama").notNull(),
    tipeSatuan: serviceUnitEnum("tipe_satuan").notNull().default("kiloan"),
    harga: numeric("harga", { precision: 12, scale: 2 }).notNull().default("0"),
    // Estimasi selesai: nilai + satuan (mis. 6 "jam" atau 2 "hari").
    // Kolom DB tetap bernama estimasi_jam (menyimpan nilai apa pun satuannya).
    estimasiNilai: integer("estimasi_jam"),
    estimasiSatuan: estimasiUnitEnum("estimasi_satuan").notNull().default("jam"),
    kategori: text("kategori"),
    expressTersedia: boolean("express_tersedia").notNull().default(false),
    aktif: boolean("aktif").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("services_tenant_id_idx").on(t.tenantId)],
);

export const servicesRelations = relations(services, ({ one }) => ({
  tenant: one(tenants, {
    fields: [services.tenantId],
    references: [tenants.id],
  }),
  outlet: one(outlets, {
    fields: [services.outletId],
    references: [outlets.id],
  }),
}));

// --- consumers: data konsumen laundry (Phase 1.2) -------------------------
// Privasi: daftar tidak ditampilkan bebas — akses lewat pencarian.
export const consumerGenderEnum = pgEnum("consumer_gender", ["pria", "wanita"]);

export const consumers = pgTable(
  "consumers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    nama: text("nama").notNull(),
    hp: text("hp"),
    gender: consumerGenderEnum("gender"),
    // Data opsional
    instansi: text("instansi"),
    email: text("email"),
    tanggalLahir: date("tanggal_lahir"),
    agama: text("agama"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("consumers_tenant_id_idx").on(t.tenantId),
    index("consumers_hp_idx").on(t.hp),
  ],
);

export const consumersRelations = relations(consumers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [consumers.tenantId],
    references: [tenants.id],
  }),
}));

// --- transactions: jantung POS (Phase 1.3) --------------------------------
export const transactionTypeEnum = pgEnum("transaction_type", [
  "reguler",
  "self_service",
  "dropoff",
  "deposit",
]);
export const workStatusEnum = pgEnum("work_status", [
  "belum_dikerjakan",
  "proses",
  "selesai",
  "diambil",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "belum_dibayar",
  "dp",
  "lunas",
]);
export const itemStatusEnum = pgEnum("item_status", [
  "belum_dikerjakan",
  "selesai",
]);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    outletId: uuid("outlet_id").references(() => outlets.id, {
      onDelete: "set null",
    }),
    noNota: text("no_nota").notNull().unique(),
    tipe: transactionTypeEnum("tipe").notNull().default("reguler"),
    consumerId: uuid("consumer_id").references(() => consumers.id, {
      onDelete: "set null",
    }),
    kasirId: uuid("kasir_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    orderDiterima: timestamp("order_diterima", { withTimezone: true })
      .notNull()
      .defaultNow(),
    estimasiSelesai: timestamp("estimasi_selesai", { withTimezone: true }),
    statusPekerjaan: workStatusEnum("status_pekerjaan")
      .notNull()
      .default("belum_dikerjakan"),
    statusPembayaran: paymentStatusEnum("status_pembayaran")
      .notNull()
      .default("belum_dibayar"),
    isExpress: boolean("is_express").notNull().default(false),
    catatan: text("catatan"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    diskon: numeric("diskon", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    biayaExpress: numeric("biaya_express", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    grandTotal: numeric("grand_total", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("transactions_tenant_id_idx").on(t.tenantId),
    index("transactions_consumer_id_idx").on(t.consumerId),
  ],
);

export const transactionItems = pgTable(
  "transaction_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),
    namaLayanan: text("nama_layanan").notNull(),
    tipeSatuan: text("tipe_satuan").notNull(),
    qty: numeric("qty", { precision: 12, scale: 2 }).notNull().default("1"),
    harga: numeric("harga", { precision: 12, scale: 2 }).notNull().default("0"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    status: itemStatusEnum("status").notNull().default("belum_dikerjakan"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("transaction_items_tx_idx").on(t.transactionId),
    index("transaction_items_tenant_id_idx").on(t.tenantId),
  ],
);

export const transactionsRelations = relations(
  transactions,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [transactions.tenantId],
      references: [tenants.id],
    }),
    consumer: one(consumers, {
      fields: [transactions.consumerId],
      references: [consumers.id],
    }),
    items: many(transactionItems),
  }),
);

export const transactionItemsRelations = relations(
  transactionItems,
  ({ one }) => ({
    transaction: one(transactions, {
      fields: [transactionItems.transactionId],
      references: [transactions.id],
    }),
    service: one(services, {
      fields: [transactionItems.serviceId],
      references: [services.id],
    }),
  }),
);

// --- chart_of_accounts: bagan akun / COA (Phase 2.1) ----------------------
export const accountTypeEnum = pgEnum("account_type", [
  "aset",
  "kewajiban",
  "modal",
  "pendapatan",
  "beban",
]);
export const normalBalanceEnum = pgEnum("normal_balance", ["debit", "kredit"]);

export const chartOfAccounts = pgTable(
  "chart_of_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    kode: text("kode").notNull(),
    nama: text("nama").notNull(),
    tipe: accountTypeEnum("tipe").notNull(),
    saldoNormal: normalBalanceEnum("saldo_normal").notNull(),
    // parent akun (hierarki) — id akun induk, tanpa FK ketat.
    parentId: uuid("parent_id"),
    isKas: boolean("is_kas").notNull().default(false),
    aktif: boolean("aktif").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("coa_tenant_id_idx").on(t.tenantId),
    unique("coa_tenant_kode_unique").on(t.tenantId, t.kode),
  ],
);

export const chartOfAccountsRelations = relations(
  chartOfAccounts,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [chartOfAccounts.tenantId],
      references: [tenants.id],
    }),
  }),
);

// --- journal_entries / journal_lines: double-entry (Phase 2.2) ------------
export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    tanggal: timestamp("tanggal", { withTimezone: true })
      .notNull()
      .defaultNow(),
    keterangan: text("keterangan").notNull(),
    // Sumber jurnal (idempotensi): mis. refType="pelunasan", refId=transaksi.id
    refType: text("ref_type"),
    refId: uuid("ref_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("je_tenant_id_idx").on(t.tenantId),
    index("je_ref_idx").on(t.refType, t.refId),
  ],
);

export const journalLines = pgTable(
  "journal_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => chartOfAccounts.id),
    debit: numeric("debit", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    kredit: numeric("kredit", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("jl_entry_idx").on(t.entryId),
    index("jl_account_idx").on(t.accountId),
    index("jl_tenant_id_idx").on(t.tenantId),
  ],
);

export const journalEntriesRelations = relations(
  journalEntries,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [journalEntries.tenantId],
      references: [tenants.id],
    }),
    lines: many(journalLines),
  }),
);

export const journalLinesRelations = relations(journalLines, ({ one }) => ({
  entry: one(journalEntries, {
    fields: [journalLines.entryId],
    references: [journalEntries.id],
  }),
  account: one(chartOfAccounts, {
    fields: [journalLines.accountId],
    references: [chartOfAccounts.id],
  }),
}));

// --- inventory: bahan/perlengkapan per outlet (Phase 5) -------------------
export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", [
  "pembelian",
  "pemakaian",
  "penyesuaian",
]);

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    outletId: uuid("outlet_id").references(() => outlets.id, {
      onDelete: "cascade",
    }),
    nama: text("nama").notNull(),
    satuan: text("satuan").notNull().default("pcs"),
    stok: numeric("stok", { precision: 14, scale: 2 }).notNull().default("0"),
    harga: numeric("harga", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    minStok: numeric("min_stok", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    aktif: boolean("aktif").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("inv_items_tenant_id_idx").on(t.tenantId),
    index("inv_items_outlet_id_idx").on(t.outletId),
  ],
);

// Riwayat pergerakan stok (append-only). Saldo item = dihitung + disimpan.
export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    outletId: uuid("outlet_id").references(() => outlets.id, {
      onDelete: "set null",
    }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    tipe: inventoryMovementTypeEnum("tipe").notNull(),
    // Delta bertanda: + menambah stok, − mengurangi.
    qtyDelta: numeric("qty_delta", { precision: 14, scale: 2 }).notNull(),
    hargaSatuan: numeric("harga_satuan", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    saldoSesudah: numeric("saldo_sesudah", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    keterangan: text("keterangan"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("inv_mov_tenant_id_idx").on(t.tenantId),
    index("inv_mov_item_id_idx").on(t.itemId),
  ],
);

export const inventoryItemsRelations = relations(inventoryItems, ({ one }) => ({
  tenant: one(tenants, {
    fields: [inventoryItems.tenantId],
    references: [tenants.id],
  }),
  outlet: one(outlets, {
    fields: [inventoryItems.outletId],
    references: [outlets.id],
  }),
}));

export const inventoryMovementsRelations = relations(
  inventoryMovements,
  ({ one }) => ({
    item: one(inventoryItems, {
      fields: [inventoryMovements.itemId],
      references: [inventoryItems.id],
    }),
  }),
);

/*
 * ---- Tipe bantu -----------------------------------------------------------
 * Ekspor tipe TypeScript agar aman dipakai di seluruh aplikasi.
 */
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type Outlet = typeof outlets.$inferSelect;
export type NewOutlet = typeof outlets.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type AccessLevel = typeof accessLevels.$inferSelect;
export type NewAccessLevel = typeof accessLevels.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type Consumer = typeof consumers.$inferSelect;
export type NewConsumer = typeof consumers.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type TransactionItem = typeof transactionItems.$inferSelect;
export type NewTransactionItem = typeof transactionItems.$inferInsert;
export type ChartAccount = typeof chartOfAccounts.$inferSelect;
export type NewChartAccount = typeof chartOfAccounts.$inferInsert;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;
export type JournalLine = typeof journalLines.$inferSelect;
export type NewJournalLine = typeof journalLines.$inferInsert;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type NewInventoryMovement = typeof inventoryMovements.$inferInsert;
