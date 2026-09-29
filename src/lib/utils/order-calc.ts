export type OrderCalcItem = {
  price: number;
  qty: number;
};

export type OrderTotals = {
  /** Jumlah harga Item × qty — pendapatan Pedagang (diterima penuh). */
  subtotal: number;
  /** Biaya Layanan yang berlaku saat Pesanan dibuat. */
  platformFeeSnapshot: number;
  /** Ongkir Pesanan Antar (0 untuk Ambil sendiri). */
  deliveryFeeSnapshot: number;
  /** Yang diterima Pedagang = `subtotal + deliveryFeeSnapshot` (Biaya Layanan tidak dipotong, Ongkir 100% Pedagang). */
  totalForMerchant: number;
  /** Yang ditagih ke Pembeli = `subtotal + platformFeeSnapshot + deliveryFeeSnapshot`. */
  grandTotal: number;
};

/**
 * Total sebuah Pesanan. Biaya Layanan **dibebankan ke Pembeli** (di atas harga
 * Item) — Pedagang menerima `subtotal` penuh, Pembeli membayar `grandTotal`.
 * Lihat docs/ARSITEKTUR-SISTEM.md ADR 2026-09-09. Ongkir Pesanan Antar juga
 * ditambahkan ke tagihan Pembeli dan masuk penuh ke Pedagang (ADR 2026-09-28).
 */
export function calculateOrderTotals(
  items: OrderCalcItem[],
  platformFeeAmount: number,
  deliveryFee = 0,
): OrderTotals {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const platformFeeSnapshot = platformFeeAmount;
  const deliveryFeeSnapshot = deliveryFee;

  return {
    subtotal,
    platformFeeSnapshot,
    deliveryFeeSnapshot,
    totalForMerchant: subtotal + deliveryFeeSnapshot,
    grandTotal: subtotal + platformFeeSnapshot + deliveryFeeSnapshot,
  };
}

type StoredOrderAmounts = {
  subtotal: number;
  platformFeeSnapshot: number;
  deliveryFeeSnapshot: number;
};

/**
 * Total yang dibayar Pembeli untuk sebuah Pesanan yang sudah tersimpan —
 * turunan dari kolom snapshot, jadi histori tidak berubah retroaktif.
 */
export function orderGrandTotal(order: StoredOrderAmounts): number {
  return order.subtotal + order.platformFeeSnapshot + order.deliveryFeeSnapshot;
}

/**
 * Yang BENAR-BENAR dibayar Pembeli lewat channel Pesanan itu. QRIS pribadi
 * tidak memungut Biaya Layanan dari Pembeli (ditagih mingguan ke Pedagang),
 * tapi Ongkir tetap dibayar karena memang milik Pedagang.
 */
export function orderAmountToPay(
  order: StoredOrderAmounts,
  isQrisPribadi: boolean,
): number {
  return isQrisPribadi
    ? order.subtotal + order.deliveryFeeSnapshot
    : orderGrandTotal(order);
}
