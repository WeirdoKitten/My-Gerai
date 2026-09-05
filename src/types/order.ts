import type { orderItems, orders } from "@/lib/db/schema";

export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;

/** Baris Item yang aman ditampilkan ke Pembeli (tanpa data internal). */
export type BuyerOrderItemView = {
  id: string;
  productNameSnapshot: string;
  priceSnapshot: number;
  qty: number;
  note: string | null;
};

/**
 * Bentuk hasil yang dikembalikan ke halaman status Pesanan Pembeli.
 * Tidak pernah membawa field internal (merchantId, dst) — lihat
 * docs/CODING-STYLE.md#struktur-fungsi-server-action.
 */
export type BuyerOrderStatusView = {
  id: string;
  orderCode: string;
  status: Order["status"];
  buyerName: string;
  stallName: string;
  subtotal: number;
  platformFeeSnapshot: number;
  totalForMerchant: number;
  createdAt: Date;
  expiresAt: Date;
  paidAt: Date | null;
  items: BuyerOrderItemView[];
  /** Hanya terisi kalau status masih `menunggu_pembayaran`. */
  qrImageUrl: string | null;
};

export type CreateOrderResult =
  | { ok: true; orderId: string; orderCode: string }
  | { ok: false; message: string };

export type SimulatePaymentResult = { ok: boolean; message?: string };

/** Baris Item dalam daftar Pesanan Pedagang (dashboard). */
export type MerchantOrderItemView = {
  id: string;
  productNameSnapshot: string;
  priceSnapshot: number;
  qty: number;
  note: string | null;
};

/**
 * Bentuk hasil daftar Pesanan untuk dashboard Pedagang — hanya Pesanan milik
 * Lapak sendiri (difilter dari sesi login, lihat src/server/orders.ts),
 * tanpa field internal seperti `merchantId`.
 */
export type MerchantOrderListItem = {
  id: string;
  orderCode: string;
  status: Order["status"];
  buyerName: string;
  buyerNote: string | null;
  createdAt: Date;
  items: MerchantOrderItemView[];
};

export type UpdateOrderStatusResult = { ok: boolean; message?: string };

/** Bentuk hasil daftar Pesanan lintas-Lapak untuk Admin (Daftar Transaksi). */
export type AdminOrderListItem = {
  id: string;
  orderCode: string;
  stallName: string;
  buyerName: string;
  status: Order["status"];
  subtotal: number;
  platformFeeSnapshot: number;
  totalForMerchant: number;
  createdAt: Date;
  paidAt: Date | null;
};
