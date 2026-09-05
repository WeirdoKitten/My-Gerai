import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
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
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "success",
  "failed",
  "expired",
]);

export const payoutStatusEnum = pgEnum("payout_status", ["pending", "selesai"]);

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

/** Catatan transaksi payment gateway (mock sekarang, Tripay nanti). */
export const payments = pgTable("payments", {
  id: uuid().primaryKey().defaultRandom(),
  orderId: uuid()
    .notNull()
    .unique()
    .references(() => orders.id),
  provider: paymentProviderEnum().notNull(),
  referenceId: text().notNull(),
  status: paymentStatusEnum().notNull().default("pending"),
  rawPayload: text(),
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

/** Konfigurasi Aplikator (Biaya Layanan, durasi kedaluwarsa, dst) — riwayat, bukan update-in-place. */
export const platformConfig = pgTable("platform_config", {
  id: uuid().primaryKey().defaultRandom(),
  key: text().notNull(),
  value: text().notNull(),
  effectiveFrom: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
