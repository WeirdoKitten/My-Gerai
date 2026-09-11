import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Skema database MyGerai — turunan langsung dari docs/DATA-MODEL.md.
 * Konvensi: field di sini camelCase, kolom di Postgres otomatis snake_case
 * (lihat `casing: "snake_case"` di drizzle.config.ts & src/lib/db/client.ts).
 *
 * Postgres self-hosted (bukan Supabase) diakses HANYA lewat kode server
 * tepercaya (Server Action/Route Handler) — browser tidak pernah konek
 * langsung ke DB. Karena itu isolasi antar Lapak ditegakkan di level
 * aplikasi (setiap query yang menyentuh data Pedagang WAJIB difilter
 * eksplisit lewat identitas sesi login), bukan Row Level Security Postgres
 * — lihat docs/DATA-MODEL.md#keamanan-multi-tenant-isolasi-level-aplikasi.
 */

export const merchantStatusEnum = pgEnum("merchant_status", [
  "pending",
  "approved",
  "rejected",
  "suspended",
]);

export const productStatusEnum = pgEnum("product_status", [
  "available",
  "sold_out",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "menunggu_pembayaran",
  "dibayar",
  "diproses",
  "siap_diambil",
  "selesai",
  "dibatalkan",
  "kedaluwarsa",
]);

export const paymentProviderEnum = pgEnum("payment_provider", [
  "mock",
  "tripay",
  "midtrans",
  "qris_pribadi",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "success",
  "failed",
  "expired",
]);

export const payoutStatusEnum = pgEnum("payout_status", ["pending", "selesai"]);

/** Metode pembayaran Lapak — hanya Admin yang boleh mengubah (lihat setMerchantPaymentMode). */
export const merchantPaymentModeEnum = pgEnum("merchant_payment_mode", [
  "gateway",
  "qris_pribadi",
]);

export const serviceFeeInvoiceStatusEnum = pgEnum(
  "service_fee_invoice_status",
  ["belum_lunas", "lunas", "dibatalkan"],
);

/** Akun internal Aplikator. Dibuat manual, bukan self-service. */
export const admins = pgTable("admins", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  phone: text().notNull().unique(),
  passwordHash: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Pedagang/Lapak — MVP: 1 baris = 1 Pedagang = 1 Lapak. */
export const merchants = pgTable("merchants", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  stallName: text().notNull(),
  ownerName: text().notNull(),
  category: text().notNull(),
  phone: text().notNull().unique(),
  passwordHash: text().notNull(),
  photoUrl: text(),
  status: merchantStatusEnum().notNull().default("pending"),
  payoutAccountInfo: text(),
  /** Wajib diisi Admin saat reject — ditampilkan ke Pedagang saat mereka coba login. */
  rejectionReason: text(),
  /** Hanya Admin yang boleh ubah (lihat setMerchantPaymentMode) — Pedagang cuma unggah qrisPhotoUrl. */
  paymentMode: merchantPaymentModeEnum().notNull().default("gateway"),
  /** Foto QRIS statis milik Pedagang sendiri, dipakai saat paymentMode = "qris_pribadi". */
  qrisPhotoUrl: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Item — produk/menu milik sebuah Lapak. */
export const products = pgTable("products", {
  id: uuid().primaryKey().defaultRandom(),
  merchantId: uuid()
    .notNull()
    .references(() => merchants.id),
  name: text().notNull(),
  description: text(),
  price: integer().notNull(),
  /** Sisa stok. `null` = tidak dibatasi. Berkurang saat Pesanan `dibayar`. */
  stock: integer(),
  photoUrl: text(),
  status: productStatusEnum().notNull().default("available"),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Pesanan. Halaman status Pembeli (`/pesanan/[orderId]`) tidak butuh akun —
 * `id` (UUID, sulit ditebak) yang jadi "kredensial" akses, dibaca lewat Route
 * Handler/Server Component yang query by primary key. Tidak ada isu RLS/anon
 * di sini karena Pembeli tidak pernah konek langsung ke DB.
 */
export const orders = pgTable("orders", {
  id: uuid().primaryKey().defaultRandom(),
  merchantId: uuid()
    .notNull()
    .references(() => merchants.id),
  orderCode: text().notNull(),
  buyerName: text().notNull(),
  buyerNote: text(),
  status: orderStatusEnum().notNull().default("menunggu_pembayaran"),
  subtotal: integer().notNull(),
  platformFeeSnapshot: integer().notNull(),
  totalForMerchant: integer().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp({ withTimezone: true }),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  completedAt: timestamp({ withTimezone: true }),
});

/** Baris Item di dalam sebuah Pesanan (snapshot nama & harga saat itu). */
export const orderItems = pgTable("order_items", {
  id: uuid().primaryKey().defaultRandom(),
  orderId: uuid()
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid()
    .notNull()
    .references(() => products.id),
  productNameSnapshot: text().notNull(),
  priceSnapshot: integer().notNull(),
  qty: integer().notNull(),
  note: text(),
});

/** Catatan transaksi payment gateway (mock dev/test, Midtrans produksi). */
export const payments = pgTable("payments", {
  id: uuid().primaryKey().defaultRandom(),
  orderId: uuid()
    .notNull()
    .unique()
    .references(() => orders.id),
  provider: paymentProviderEnum().notNull(),
  referenceId: text().notNull(),
  /** Nominal yang dikirim ke gateway = yang ditagih ke Pembeli (`orders.subtotal + orders.platform_fee_snapshot`). Nullable: baris `mock` lama. */
  grossAmount: integer(),
  /** Payload QRIS mentah (Midtrans `qr_string` / payload dummy mock). Dirender lokal jadi gambar. */
  qrString: text(),
  status: paymentStatusEnum().notNull().default("pending"),
  rawPayload: text(),
  /** Kedaluwarsa QRIS dari gateway. Nullable. */
  expiresAt: timestamp({ withTimezone: true }),
  paidAt: timestamp({ withTimezone: true }),
});

/** Pencairan (payout) manual dari Aplikator ke Pedagang. Tulis: khusus Admin. */
export const payouts = pgTable("payouts", {
  id: uuid().primaryKey().defaultRandom(),
  merchantId: uuid()
    .notNull()
    .references(() => merchants.id),
  amount: integer().notNull(),
  status: payoutStatusEnum().notNull().default("pending"),
  note: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  settledAt: timestamp({ withTimezone: true }),
});

/**
 * Tagihan Biaya Layanan mingguan untuk Lapak `qris_pribadi` (uang Pesanan
 * langsung ke Pedagang, jadi Biaya Layanan tidak bisa dipotong otomatis —
 * ditagih belakangan lewat sini). `UNIQUE(merchantId, periodStart)` mencegah
 * cron generate dobel untuk periode yang sama (lihat src/lib/billing/).
 */
export const serviceFeeInvoices = pgTable(
  "service_fee_invoices",
  {
    id: uuid().primaryKey().defaultRandom(),
    merchantId: uuid()
      .notNull()
      .references(() => merchants.id),
    periodStart: timestamp({ withTimezone: true }).notNull(),
    periodEnd: timestamp({ withTimezone: true }).notNull(),
    /** SUM(orders.platformFeeSnapshot) Pesanan qris_pribadi yang lunas dalam periode ini. */
    amount: integer().notNull(),
    /** = periodEnd (jatuh tempo langsung saat periode tutup, tanpa buffer tambahan). */
    dueAt: timestamp({ withTimezone: true }).notNull(),
    status: serviceFeeInvoiceStatusEnum().notNull().default("belum_lunas"),
    /** Channel charge tagihan ini dibuat ("mock" saat dev/test, "midtrans" produksi). */
    provider: paymentProviderEnum().notNull(),
    /** Midtrans transaction_id untuk charge tagihan ini. Null sampai charge berhasil dibuat. */
    referenceId: text(),
    /** QR yang dipindai Pedagang untuk membayar tagihan ke Aplikator. Null sampai charge dibuat. */
    qrString: text(),
    paidAt: timestamp({ withTimezone: true }),
    /** Catatan Admin saat override manual (tandai lunas) atau membatalkan tagihan. */
    voidReason: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("service_fee_invoices_merchant_period_idx").on(
      table.merchantId,
      table.periodStart,
    ),
  ],
);

/** Konfigurasi Aplikator (Biaya Layanan, durasi kedaluwarsa, dst) — riwayat, bukan update-in-place. */
export const platformConfig = pgTable("platform_config", {
  id: uuid().primaryKey().defaultRandom(),
  key: text().notNull(),
  value: text().notNull(),
  effectiveFrom: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Sesi login Pedagang. `tokenHash` = SHA-256 dari token acak yang disimpan
 * di cookie klien — DB tidak pernah menyimpan token mentah, supaya kebocoran
 * baris ini tidak otomatis jadi kebocoran sesi aktif (lihat src/lib/auth/session.ts).
 * Tidak ada job cleanup baris kedaluwarsa — sama seperti filosofi kedaluwarsa
 * Pesanan (lazy, cukup difilter saat dibaca), volume rendah di skala MVP.
 */
export const sessions = pgTable("sessions", {
  id: uuid().primaryKey().defaultRandom(),
  merchantId: uuid()
    .notNull()
    .references(() => merchants.id, { onDelete: "cascade" }),
  tokenHash: text().notNull().unique(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
});

/**
 * Sesi login Admin — tabel terpisah dari `sessions` (bukan polimorfik),
 * konsisten dengan `merchants`/`admins` yang sudah sengaja dipisah sejak
 * awal. Struktur & alasan sama persis dengan `sessions` di atas.
 */
export const adminSessions = pgTable("admin_sessions", {
  id: uuid().primaryKey().defaultRandom(),
  adminId: uuid()
    .notNull()
    .references(() => admins.id, { onDelete: "cascade" }),
  tokenHash: text().notNull().unique(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
});
