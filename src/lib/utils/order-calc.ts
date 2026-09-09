export type OrderCalcItem = {
  price: number;
  qty: number;
};

export type OrderTotals = {
  /** Jumlah harga Item × qty — pendapatan Pedagang (diterima penuh). */
  subtotal: number;
  /** Biaya Layanan yang berlaku saat Pesanan dibuat. */
  platformFeeSnapshot: number;
  /** Yang diterima Pedagang = `subtotal` (Biaya Layanan tidak lagi dipotong). */
  totalForMerchant: number;
  /** Yang ditagih ke Pembeli = `subtotal + platformFeeSnapshot`. */
  grandTotal: number;
};

/**
 * Total sebuah Pesanan. Biaya Layanan **dibebankan ke Pembeli** (di atas harga
 * Item) — Pedagang menerima `subtotal` penuh, Pembeli membayar `grandTotal`.
 * Lihat docs/ARSITEKTUR-SISTEM.md ADR 2026-09-09.
 */
export function calculateOrderTotals(
  items: OrderCalcItem[],
  platformFeeAmount: number,
): OrderTotals {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const platformFeeSnapshot = platformFeeAmount;

  return {
    subtotal,
    platformFeeSnapshot,
    totalForMerchant: subtotal,
    grandTotal: subtotal + platformFeeSnapshot,
  };
}

/**
 * Total yang dibayar Pembeli untuk sebuah Pesanan yang sudah tersimpan —
 * turunan dari kolom snapshot, jadi histori tidak berubah retroaktif.
 */
export function orderGrandTotal(order: {
  subtotal: number;
  platformFeeSnapshot: number;
}): number {
  return order.subtotal + order.platformFeeSnapshot;
}
