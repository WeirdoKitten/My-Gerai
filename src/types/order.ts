import type { orderItems, orders } from "@/lib/db/schema";
import type {
  DeliveryFailureReason,
  FulfillmentMethod,
} from "@/lib/utils/order-status";
import type { OrderReviewView } from "@/types/review";

export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;

/** Snapshot satu pilihan varian pada baris Item Pesanan — lihat order_item_variant_selections. */
export type OrderItemVariantSelectionView = {
  groupNameSnapshot: string;
  optionNameSnapshot: string;
  priceDeltaSnapshot: number;
};

/** Info antar yang aman ditampilkan ke Pembeli pemilik Pesanan (tanpa nomor Pedagang). */
export type BuyerOrderDeliveryView = {
  address: string;
  landmark: string | null;
  failureReason: DeliveryFailureReason | null;
  failureNote: string | null;
};

/** Info antar untuk Pedagang pemilik Pesanan (dashboard/riwayat). */
export type MerchantOrderDeliveryView = {
  /** Nomor ternormalisasi `62...`, siap dipakai `wa.me`. */
  buyerPhone: string;
  address: string;
  landmark: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  startedAt: Date | null;
  failureReason: DeliveryFailureReason | null;
  failureNote: string | null;
};

/** Baris Item yang aman ditampilkan ke Pembeli (tanpa data internal). */
export type BuyerOrderItemView = {
  id: string;
  productNameSnapshot: string;
  priceSnapshot: number;
  qty: number;
  note: string | null;
  variantSelections: OrderItemVariantSelectionView[];
};

/**
 * Bentuk hasil yang dikembalikan ke halaman status Pesanan Pembeli.
 * Tidak pernah membawa field internal (merchantId, dst) — lihat
 * docs/CODING-STYLE.md#struktur-fungsi-server-action.
 */
/** Respons polling ringan halaman status Pembeli (lihat getOrderStatusSummary). */
export type BuyerOrderStatusSummary = { status: Order["status"] };

export type BuyerOrderStatusView = {
  id: string;
  orderCode: string;
  status: Order["status"];
  buyerName: string;
  stallName: string;
  subtotal: number;
  platformFeeSnapshot: number;
  deliveryFeeSnapshot: number;
  totalForMerchant: number;
  /** Nilai ekonomi penuh Pesanan = `subtotal + platformFeeSnapshot + deliveryFeeSnapshot` — dipakai laporan/Admin, BUKAN selalu = yang dibayar Pembeli. */
  grandTotal: number;
  /**
   * Yang BENAR-BENAR dibayar Pembeli: `grandTotal` untuk mode gateway, atau
   * `subtotal + Ongkir` untuk `qris_pribadi` (Biaya Layanan ditagih belakangan
   * ke Pedagang lewat tagihan mingguan, bukan dipungut dari Pembeli).
   */
  amountToPay: number;
  fulfillmentMethod: FulfillmentMethod;
  /** `null` untuk Ambil sendiri. */
  delivery: BuyerOrderDeliveryView | null;
  /** Jadwal ambil/antar Pesanan pre-order. `null` = Pesanan biasa. */
  scheduledFor: Date | null;
  /** `true` kalau Pesanan ini dibayar lewat QRIS pribadi Pedagang (bukan gateway). */
  isQrisPribadi: boolean;
  createdAt: Date;
  expiresAt: Date;
  paidAt: Date | null;
  items: BuyerOrderItemView[];
  /** Hanya terisi kalau status masih `menunggu_pembayaran`. */
  qrImageUrl: string | null;
  /** `true` hanya di mode pengujian (`PAYMENT_PROVIDER=mock`) & masih menunggu pembayaran. */
  canSimulate: boolean;
  /** URL gambar QR di Midtrans, HANYA di sandbox — untuk ditempel ke simulator QRIS. `null` di produksi/mock. */
  sandboxQrUrl: string | null;
  /** Rating & Ulasan Pesanan ini — hanya dimuat saat status `selesai`; `null` = belum diulas. */
  review: OrderReviewView | null;
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
  variantSelections: OrderItemVariantSelectionView[];
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
  fulfillmentMethod: FulfillmentMethod;
  deliveryFeeSnapshot: number;
  /** `null` untuk Ambil sendiri. */
  delivery: MerchantOrderDeliveryView | null;
  /** Jadwal ambil/antar Pesanan pre-order. `null` = Pesanan biasa. */
  scheduledFor: Date | null;
  /** Nomor HP Pembeli (`62...`) -- terisi untuk Pesanan Antar & pre-order. */
  buyerPhone: string | null;
  /**
   * `true` = Pesanan QRIS pribadi yang masih `menunggu_pembayaran`, tampilkan
   * tombol "Tandai Lunas" (markQrisPribadiOrderPaid) alih-alih tombol status
   * normal (nextMerchantStatus hanya berlaku mulai status `dibayar`).
   */
  awaitingManualConfirmation: boolean;
};

/**
 * Hasil `listMerchantOrders` — `orders` dibatasi (lihat ACTIVE_ORDER_LIST_LIMIT
 * di src/server/orders.ts) supaya dashboard tidak berat kalau Pesanan aktif
 * menumpuk; `totalActive` dipakai tampilkan "+N pesanan lain" kalau terpotong.
 */
export type MerchantOrderListResult = {
  orders: MerchantOrderListItem[];
  totalActive: number;
};

export type UpdateOrderStatusResult = { ok: boolean; message?: string };

/**
 * Bentuk hasil daftar Riwayat Pesanan untuk dashboard Pedagang — Pesanan milik
 * Lapak sendiri yang sudah berstatus akhir (`selesai`/`kedaluwarsa`/`dibatalkan`),
 * read-only, tanpa field internal seperti `merchantId`.
 */
export type MerchantOrderHistoryItem = {
  id: string;
  orderCode: string;
  status: Order["status"];
  buyerName: string;
  subtotal: number;
  platformFeeSnapshot: number;
  totalForMerchant: number;
  createdAt: Date;
  paidAt: Date | null;
  completedAt: Date | null;
  items: MerchantOrderItemView[];
  deliveryFeeSnapshot: number;
  fulfillmentMethod: FulfillmentMethod;
  delivery: MerchantOrderDeliveryView | null;
  /** Jadwal ambil/antar Pesanan pre-order. `null` = Pesanan biasa. */
  scheduledFor: Date | null;
};

/**
 * Data struk cetak satu Pesanan lunas milik Lapak sendiri (`getOrderReceipt`).
 * Hanya berisi yang tercetak di kertas — tanpa field internal.
 */
export type OrderReceiptView = {
  stallName: string;
  stallAddress: string | null;
  orderCode: string;
  buyerName: string;
  buyerNote: string | null;
  paidAt: Date;
  items: MerchantOrderItemView[];
  subtotal: number;
  /** `0` untuk QRIS pribadi — Biaya Layanan tidak dipungut dari Pembeli di mode itu. */
  serviceFeePaid: number;
  /** Ongkir (0 untuk Ambil sendiri). */
  deliveryFee: number;
  /** Yang benar-benar dibayar Pembeli = `subtotal + serviceFeePaid + deliveryFee`. */
  amountPaid: number;
  /** Jadwal ambil/antar Pesanan pre-order. `null` = Pesanan biasa. */
  scheduledFor: Date | null;
  /** `null` untuk Ambil sendiri. */
  delivery: {
    buyerPhone: string;
    address: string;
    landmark: string | null;
  } | null;
};

export type GetOrderReceiptResult =
  | { ok: true; receipt: OrderReceiptView }
  | { ok: false; message: string };

/** Bentuk hasil daftar Pesanan lintas-Lapak untuk Admin (Daftar Transaksi). */
export type AdminOrderListItem = {
  id: string;
  orderCode: string;
  stallName: string;
  buyerName: string;
  status: Order["status"];
  subtotal: number;
  platformFeeSnapshot: number;
  deliveryFeeSnapshot: number;
  totalForMerchant: number;
  createdAt: Date;
  paidAt: Date | null;
  fulfillmentMethod: FulfillmentMethod;
  /** Jadwal ambil/antar Pesanan pre-order. `null` = Pesanan biasa. */
  scheduledFor: Date | null;
  deliveryFailureReason: DeliveryFailureReason | null;
  deliveryFailureNote: string | null;
};

/** Satu halaman Daftar Transaksi Admin (lihat listOrdersForAdmin). */
export type AdminOrderListPage = {
  orders: AdminOrderListItem[];
  page: number;
  hasNextPage: boolean;
};

export type TrackOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; message: string };
