/** Satu pilihan varian yang sudah dipilih Pembeli untuk baris Keranjang ini — `priceDelta` cuma tampilan, lihat catatan di `CartItem`. */
export type CartItemVariantSelection = {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
};

/**
 * `name`/`price` (sudah termasuk delta varian terpilih) di sini HANYA untuk
 * tampilan Keranjang/ringkasan checkout — bukan sumber kebenaran.
 * `createOrder` selalu mengambil ulang harga dari `products.price` +
 * `product_variant_options.price_delta` di server, tidak pernah dari cart klien.
 */
export type CartItem = {
  productId: string;
  name: string;
  price: number;
  photoUrl: string | null;
  qty: number;
  note: string;
  /** `[]` untuk Item tanpa varian. */
  variantSelections: CartItemVariantSelection[];
};

export type CartState = {
  stallSlug: string | null;
  items: CartItem[];
};

export const EMPTY_CART_STATE: CartState = { stallSlug: null, items: [] };
