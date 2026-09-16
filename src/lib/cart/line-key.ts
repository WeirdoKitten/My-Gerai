import type { CartItem } from "./types";

/**
 * Identitas satu baris Keranjang — productId SAJA tidak cukup begitu ada
 * varian: dua pilihan varian berbeda untuk Item yang sama (mis. "Bakso Pedas"
 * vs "Bakso Tidak Pedas") harus jadi baris terpisah, bukan tergabung.
 * Untuk Item tanpa varian ini reduce ke `"${productId}::"` — identitas baris
 * produk biasa tidak berubah sama sekali.
 */
export function cartLineKey(
  item: Pick<CartItem, "productId" | "variantSelections">,
): string {
  const variantKey = item.variantSelections
    .map((selection) => selection.optionId)
    .sort()
    .join(",");
  return `${item.productId}::${variantKey}`;
}
