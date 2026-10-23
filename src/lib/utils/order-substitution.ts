import type { orderItemSubstitutionEnum } from "@/lib/db/schema";
import type { OrderStatus } from "@/lib/utils/order-status";
import type { OrderItemSubstitutionView } from "@/types/order";

export type OrderItemSubstitution =
  (typeof orderItemSubstitutionEnum.enumValues)[number];

/**
 * Status Pesanan Gerai Titipan yang masih boleh ditandai penggantian Item:
 * sudah dibayar dan barang belum diserahkan (`selesai` = terkunci).
 */
export const SUBSTITUTABLE_ORDER_STATUSES: readonly OrderStatus[] = [
  "dibayar",
  "diproses",
  "siap_diambil",
];

/**
 * Waktu terakhir penggantian Item diubah (ISO), sama dengan yang dikirim
 * polling ringan halaman status Pembeli (`getOrderStatusSummary`).
 */
export function latestSubstitutedAt(
  items: { substitutedAt: Date | null }[],
): string | null {
  let latest: Date | null = null;
  for (const item of items) {
    if (item.substitutedAt && (!latest || item.substitutedAt > latest)) {
      latest = item.substitutedAt;
    }
  }
  return latest ? latest.toISOString() : null;
}

/** Baris `order_items` -> tampilan penggantian (`null` = sesuai pesanan). */
export function toSubstitutionView(item: {
  substitution: OrderItemSubstitution | null;
  substituteName: string | null;
  priceSnapshot: number;
  qty: number;
}): OrderItemSubstitutionView | null {
  if (item.substitution === "diganti") {
    return {
      kind: "diganti",
      substituteName: item.substituteName ?? "",
      refundAmount: null,
    };
  }
  if (item.substitution === "tidak_tersedia") {
    return {
      kind: "tidak_tersedia",
      substituteName: null,
      refundAmount: item.priceSnapshot * item.qty,
    };
  }
  return null;
}
