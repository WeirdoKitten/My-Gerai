/**
 * `name`/`price` di sini HANYA untuk tampilan Keranjang/ringkasan checkout —
 * bukan sumber kebenaran. `createOrder` selalu mengambil ulang harga dari
 * `products.price` di server, tidak pernah dari cart klien.
 */
export type CartItem = {
  productId: string;
  name: string;
  price: number;
  photoUrl: string | null;
  qty: number;
  note: string;
};

export type CartState = {
  stallSlug: string | null;
  items: CartItem[];
};

export const EMPTY_CART_STATE: CartState = { stallSlug: null, items: [] };
