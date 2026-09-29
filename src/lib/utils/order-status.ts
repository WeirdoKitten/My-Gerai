import type {
  deliveryFailureReasonEnum,
  orderFulfillmentMethodEnum,
  orderStatusEnum,
} from "@/lib/db/schema";

export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type FulfillmentMethod =
  (typeof orderFulfillmentMethodEnum.enumValues)[number];
export type DeliveryFailureReason =
  (typeof deliveryFailureReasonEnum.enumValues)[number];

/** Status akhir — tidak akan berubah lagi, boleh berhenti polling di titik ini. */
export const FINAL_ORDER_STATUSES: readonly OrderStatus[] = [
  "selesai",
  "dibatalkan",
  "kedaluwarsa",
  "gagal_diantar",
];

/**
 * Status Pesanan yang dananya sudah dianggap masuk (Pembeli sudah bayar) —
 * dipakai untuk Saldo Pedagang (payouts.ts) & laporan penjualan (reports.ts).
 * `menunggu_pembayaran`/`kedaluwarsa` tidak pernah dihitung sebagai penjualan.
 */
export const PAID_ORDER_STATUSES: readonly OrderStatus[] = [
  "dibayar",
  "diproses",
  "siap_diambil",
  "selesai",
  // Pesanan Antar: `gagal_diantar` tetap dihitung — tanpa refund, dana tetap
  // hak Pedagang (ADR 2026-09-28).
  "sedang_diantar",
  "gagal_diantar",
];

export function isOrderExpired(
  status: OrderStatus,
  expiresAt: Date,
  now: Date = new Date(),
): boolean {
  return (
    status === "menunggu_pembayaran" && now.getTime() > expiresAt.getTime()
  );
}

export const ORDER_STATUS_LABEL_ID: Record<OrderStatus, string> = {
  menunggu_pembayaran: "Menunggu Pembayaran",
  dibayar: "Dibayar",
  diproses: "Diproses",
  siap_diambil: "Siap Diambil",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
  kedaluwarsa: "Kedaluwarsa",
  sedang_diantar: "Sedang Diantar",
  gagal_diantar: "Gagal Diantar",
};

export const FULFILLMENT_METHOD_LABEL_ID: Record<FulfillmentMethod, string> = {
  ambil_sendiri: "Ambil Sendiri",
  antar: "Diantar",
};

export const DELIVERY_FAILURE_REASON_LABEL_ID: Record<
  DeliveryFailureReason,
  string
> = {
  tidak_bisa_dihubungi: "Pembeli tidak bisa dihubungi",
  alamat_tidak_ditemukan: "Alamat tidak ditemukan",
  lainnya: "Lainnya",
};

/**
 * Jeda minimal sejak Pesanan masuk `sedang_diantar` sebelum Pedagang boleh
 * menandai `gagal_diantar` — mencegah Pesanan digagalkan tanpa usaha, karena
 * tidak ada refund (ADR 2026-09-28).
 */
export const DELIVERY_FAIL_MIN_MINUTES = 15;

/** Sisa menit sebelum Pedagang boleh menandai "Gagal Diantar" (0 = sudah boleh). */
export function minutesUntilDeliveryFailAllowed(
  deliveryStartedAt: Date | null,
  now: Date = new Date(),
): number {
  if (!deliveryStartedAt) return DELIVERY_FAIL_MIN_MINUTES;
  const allowedAt =
    deliveryStartedAt.getTime() + DELIVERY_FAIL_MIN_MINUTES * 60_000;
  return Math.max(0, Math.ceil((allowedAt - now.getTime()) / 60_000));
}

/**
 * Transisi status yang boleh dilakukan Pedagang dari dashboard — forward-only,
 * satu langkah per aksi (lihat docs/BACKLOG.md Fase 3), beda per mode Pesanan
 * (Fase 11). Status lain (mis. `menunggu_pembayaran`, `kedaluwarsa`) tidak
 * punya tombol aksi Pedagang. `gagal_diantar` BUKAN bagian dari sini — punya
 * action sendiri (`markDeliveryFailed`) karena butuh alasan & jeda waktu.
 */
export const MERCHANT_ORDER_TRANSITIONS: Record<
  FulfillmentMethod,
  Partial<Record<OrderStatus, OrderStatus>>
> = {
  ambil_sendiri: {
    dibayar: "diproses",
    diproses: "siap_diambil",
    siap_diambil: "selesai",
  },
  antar: {
    dibayar: "diproses",
    diproses: "sedang_diantar",
    sedang_diantar: "selesai",
  },
};

export function nextMerchantStatus(
  current: OrderStatus,
  method: FulfillmentMethod = "ambil_sendiri",
): OrderStatus | null {
  return MERCHANT_ORDER_TRANSITIONS[method][current] ?? null;
}

/** Label tombol aksi Pedagang untuk maju ke status berikutnya. */
export const MERCHANT_ACTION_LABEL_ID: Record<
  FulfillmentMethod,
  Partial<Record<OrderStatus, string>>
> = {
  ambil_sendiri: {
    dibayar: "Tandai Diproses",
    diproses: "Tandai Siap Diambil",
    siap_diambil: "Tandai Selesai",
  },
  antar: {
    dibayar: "Tandai Diproses",
    diproses: "Mulai Antar",
    sedang_diantar: "Tandai Sudah Diterima",
  },
};
