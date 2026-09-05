import type { orderStatusEnum } from "@/lib/db/schema";

type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

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
