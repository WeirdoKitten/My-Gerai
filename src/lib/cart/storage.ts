import { type CartState, EMPTY_CART_STATE } from "./types";

const CART_STORAGE_KEY = "mygerai_cart_v1";

export function loadCart(): CartState {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return EMPTY_CART_STATE;
    const parsed = JSON.parse(raw) as CartState;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) {
      return EMPTY_CART_STATE;
    }
    // Cart tersimpan dari sebelum fitur varian ada belum punya
    // `variantSelections` — normalisasi jadi `[]` supaya tidak crash.
    return {
      ...parsed,
      items: parsed.items.map((item) => ({
        ...item,
        variantSelections: Array.isArray(item.variantSelections)
          ? item.variantSelections
          : [],
      })),
    };
  } catch {
    return EMPTY_CART_STATE;
  }
}

export function saveCart(state: CartState): void {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage bisa gagal (private browsing, kuota penuh) — abaikan,
    // cart tetap berfungsi untuk sesi berjalan walau tidak tersimpan.
  }
}
