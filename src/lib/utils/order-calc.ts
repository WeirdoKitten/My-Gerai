export type OrderCalcItem = {
  price: number;
  qty: number;
};

/**
 * Total Pesanan dari daftar Item + Biaya Layanan aktif. `totalForMerchant`
 * di-clamp minimal 0 — kombinasi Item gratis + Biaya Layanan tetap tidak
 * pernah membuat bagian Pedagang negatif (Aplikator menanggung selisihnya).
 */
export function calculateOrderTotals(
  items: OrderCalcItem[],
  platformFeeAmount: number,
): {
  subtotal: number;
  platformFeeSnapshot: number;
  totalForMerchant: number;
} {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const platformFeeSnapshot = platformFeeAmount;
  const totalForMerchant = Math.max(0, subtotal - platformFeeSnapshot);

  return { subtotal, platformFeeSnapshot, totalForMerchant };
}
