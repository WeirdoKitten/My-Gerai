import type { orderStatusEnum } from "@/lib/db/schema";

export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

/** Status akhir — tidak akan berubah lagi, boleh berhenti polling di titik ini. */
export const FINAL_ORDER_STATUSES: readonly OrderStatus[] = [
  "selesai",
  "dibatalkan",
  "kedaluwarsa",
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
};

/**
 * Transisi status yang boleh dilakukan Pedagang dari dashboard — forward-only,
 * satu langkah per aksi (lihat docs/BACKLOG.md Fase 3). Status lain (mis.
 * `menunggu_pembayaran`, `kedaluwarsa`) tidak punya tombol aksi Pedagang.
 */
export const MERCHANT_ORDER_TRANSITIONS: Partial<
  Record<OrderStatus, OrderStatus>
> = {
  dibayar: "diproses",
  diproses: "siap_diambil",
  siap_diambil: "selesai",
};

export function nextMerchantStatus(current: OrderStatus): OrderStatus | null {
  return MERCHANT_ORDER_TRANSITIONS[current] ?? null;
}

/** Label tombol aksi Pedagang untuk maju ke status berikutnya. */
export const MERCHANT_ACTION_LABEL_ID: Partial<Record<OrderStatus, string>> = {
  dibayar: "Tandai Diproses",
  diproses: "Tandai Siap Diambil",
  siap_diambil: "Tandai Selesai",
};
