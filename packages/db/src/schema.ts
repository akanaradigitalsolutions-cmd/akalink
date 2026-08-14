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
  // Loyalitas: rupiah untuk 1 poin (0 = poin nonaktif).
  poinRupiah: integer("poin_rupiah").notNull().default(0),
  // Aktivasi fitur (per laundry).
  fiturMember: boolean("fitur_member").notNull().default(false),
  fiturPoin: boolean("fitur_poin").notNull().default(false),
  fiturPromo: boolean("fitur_promo").notNull().default(false),
  // Pembayaran digital konsumen (QRIS/e-wallet via DOKU).
  fiturBayarDigital: boolean("fitur_bayar_digital").notNull().default(false),
  // Waktu owner menyetujui syarat biaya pembayaran digital (null = belum).
  bayarDigitalSetujuAt: timestamp("bayar_digital_setuju_at", {
    withTimezone: true,
  }),
  // Saldo dana masuk dari pembayaran digital yang siap ditarik (Rupiah).
  saldoPembayaran: integer("saldo_pembayaran").notNull().default(0),
  // (Tidak dipakai lagi — biaya kini ketentuan platform; disimpan utk kompat.)
  biayaAdminPersen: numeric("biaya_admin_persen", { precision: 5, scale: 2 })
    .notNull()
    .default("3.5"),
  biayaTransfer: integer("biaya_transfer").notNull().default(2500),
  // Saldo Koin AkaLink (dompet aplikasi milik laundry) — dalam Rupiah.
  saldoKoin: integer("saldo_koin").notNull().default(0),
  // Tarif pemakaian aplikasi (Rupiah) yang dipotong dari saldo koin.
  biayaPerNota: integer("biaya_per_nota").notNull().default(50),
  biayaPerWa: integer("biaya_per_wa").notNull().default(50),
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

// --- member_types: jenis keanggotaan + diskon otomatis (Phase 4) ----------
export const memberTypes = pgTable(
  "member_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    nama: text("nama").notNull(),
    diskonPersen: numeric("diskon_persen", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    aktif: boolean("aktif").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("member_types_tenant_id_idx").on(t.tenantId)],
);

// --- promos: kode promo/voucher (Phase 4) ---------------------------------
export const promoTypeEnum = pgEnum("promo_type", ["persen", "nominal"]);

export const promos = pgTable(
  "promos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    kode: text("kode").notNull(),
    nama: text("nama").notNull(),
    tipe: promoTypeEnum("tipe").notNull().default("persen"),
    nilai: numeric("nilai", { precision: 14, scale: 2 }).notNull().default("0"),
    minBelanja: numeric("min_belanja", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    // Batas potongan untuk tipe persen (0 = tanpa batas).
    maxPotongan: numeric("max_potongan", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    berlakuSampai: date("berlaku_sampai"),
    aktif: boolean("aktif").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("promos_tenant_id_idx").on(t.tenantId),
    unique("promos_tenant_kode_unique").on(t.tenantId, t.kode),
  ],
);

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
    // Keanggotaan & loyalitas (Phase 4)
    memberTypeId: uuid("member_type_id").references(() => memberTypes.id, {
      onDelete: "set null",
    }),
    poin: numeric("poin", { precision: 14, scale: 2 }).notNull().default("0"),
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

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    nama: text("nama").notNull(),
    telepon: text("telepon"),
    alamat: text("alamat"),
    aktif: boolean("aktif").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("suppliers_tenant_id_idx").on(t.tenantId)],
);

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
    supplierId: uuid("supplier_id").references(() => suppliers.id, {
      onDelete: "set null",
    }),
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

// --- point_transactions: ledger poin loyalitas (Phase 4) -----------------
export const pointTxTypeEnum = pgEnum("point_tx_type", [
  "perolehan",
  "penukaran",
  "penyesuaian",
]);

export const pointTransactions = pgTable(
  "point_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    consumerId: uuid("consumer_id")
      .notNull()
      .references(() => consumers.id, { onDelete: "cascade" }),
    tipe: pointTxTypeEnum("tipe").notNull(),
    // Delta bertanda: + perolehan, − penukaran.
    delta: numeric("delta", { precision: 14, scale: 2 }).notNull(),
    keterangan: text("keterangan"),
    refType: text("ref_type"),
    refId: uuid("ref_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("point_tx_tenant_id_idx").on(t.tenantId),
    index("point_tx_consumer_id_idx").on(t.consumerId),
    index("point_tx_ref_idx").on(t.refType, t.refId),
  ],
);

// --- app_coin_ledger: mutasi Saldo Koin AkaLink (Phase 6) ----------------
// Monetisasi platform: setiap Nota & pengiriman WhatsApp memotong saldo koin
// laundry. Isi ulang (top-up) via DOKU akan menambah saldo.
export const appCoinTipeEnum = pgEnum("app_coin_tipe", [
  "topup", // isi ulang saldo (mis. via DOKU)
  "pemakaian", // potongan biaya (nota / whatsapp)
  "bonus", // bonus/hadiah dari platform
  "penyesuaian", // koreksi manual
]);

export const appCoinLedger = pgTable(
  "app_coin_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    tipe: appCoinTipeEnum("tipe").notNull(),
    // Delta bertanda (Rupiah): + menambah, − memotong saldo.
    delta: integer("delta").notNull(),
    // Saldo koin setelah mutasi ini (Rupiah).
    saldoSesudah: integer("saldo_sesudah").notNull(),
    keterangan: text("keterangan"),
    // Sumber mutasi: 'nota' | 'whatsapp' | 'topup' | 'manual' | 'doku'.
    refType: text("ref_type"),
    refId: uuid("ref_id"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("app_coin_tenant_id_idx").on(t.tenantId),
    index("app_coin_ref_idx").on(t.refType, t.refId),
  ],
);

// --- coin_topup_orders: pesanan isi ulang Saldo Koin via DOKU (Phase 6) --
export const coinTopupStatusEnum = pgEnum("coin_topup_status", [
  "pending",
  "success",
  "failed",
  "expired",
]);

export const coinTopupOrders = pgTable(
  "coin_topup_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    // Nomor invoice unik yang dikirim ke DOKU (dipakai mencocokkan notifikasi).
    invoiceNumber: text("invoice_number").notNull().unique(),
    amount: integer("amount").notNull(),
    status: coinTopupStatusEnum("status").notNull().default("pending"),
    // Metode & referensi dari DOKU.
    channel: text("channel"),
    dokuTokenId: text("doku_token_id"),
    paymentUrl: text("payment_url"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [index("coin_topup_tenant_id_idx").on(t.tenantId)],
);

// --- payment_orders: pembayaran nota konsumen via DOKU (Phase 6) ---------
export const paymentOrders = pgTable(
  "payment_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    outletId: uuid("outlet_id").references(() => outlets.id, {
      onDelete: "set null",
    }),
    invoiceNumber: text("invoice_number").notNull().unique(),
    // Nominal kotor (total nota yang dibayar konsumen).
    amount: integer("amount").notNull(),
    // Biaya penanganan (ditanggung laundry): 3,5% + biaya transfer.
    feeAdmin: integer("fee_admin").notNull().default(0),
    feeTransfer: integer("fee_transfer").notNull().default(0),
    // Nominal bersih yang diterima laundry (amount − fee).
    netAmount: integer("net_amount").notNull().default(0),
    status: coinTopupStatusEnum("status").notNull().default("pending"),
    channel: text("channel"),
    dokuTokenId: text("doku_token_id"),
    paymentUrl: text("payment_url"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [
    index("payment_orders_tenant_id_idx").on(t.tenantId),
    index("payment_orders_transaction_id_idx").on(t.transactionId),
  ],
);

// --- withdrawals: penarikan dana pembayaran digital ke bank (Phase 6) ----
export const withdrawals = pgTable(
  "withdrawals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    // Jumlah yang ditarik dari saldo pembayaran (kotor).
    amount: integer("amount").notNull(),
    // Biaya transfer (ketentuan platform / sesuai bank).
    fee: integer("fee").notNull().default(0),
    // Nominal bersih yang diterima ke rekening (amount − fee).
    netAmount: integer("net_amount").notNull(),
    bankNama: text("bank_nama").notNull(),
    bankRekening: text("bank_rekening").notNull(),
    bankAtasNama: text("bank_atas_nama").notNull(),
    status: coinTopupStatusEnum("status").notNull().default("pending"),
    catatan: text("catatan"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [index("withdrawals_tenant_id_idx").on(t.tenantId)],
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
export type MemberType = typeof memberTypes.$inferSelect;
export type NewMemberType = typeof memberTypes.$inferInsert;
export type PointTransaction = typeof pointTransactions.$inferSelect;
export type NewPointTransaction = typeof pointTransactions.$inferInsert;
export type Promo = typeof promos.$inferSelect;
export type NewPromo = typeof promos.$inferInsert;
export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
export type AppCoinLedger = typeof appCoinLedger.$inferSelect;
export type NewAppCoinLedger = typeof appCoinLedger.$inferInsert;
export type CoinTopupOrder = typeof coinTopupOrders.$inferSelect;
export type NewCoinTopupOrder = typeof coinTopupOrders.$inferInsert;
export type PaymentOrder = typeof paymentOrders.$inferSelect;
export type NewPaymentOrder = typeof paymentOrders.$inferInsert;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type NewWithdrawal = typeof withdrawals.$inferInsert;
