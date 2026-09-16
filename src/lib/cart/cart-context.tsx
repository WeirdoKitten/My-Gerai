"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { getMerchantPaymentMode, getStallOpenState } from "@/server/products";
import { cartLineKey } from "./line-key";
import { loadCart, saveCart } from "./storage";
import { type CartItem, type CartState, EMPTY_CART_STATE } from "./types";

type MerchantPaymentMode = "gateway" | "qris_pribadi";

type CartAction =
  | { type: "HYDRATE"; state: CartState }
  | { type: "ADD_ITEM"; stallSlug: string; item: CartItem }
  | { type: "UPDATE_QTY"; lineKey: string; qty: number }
  | { type: "UPDATE_NOTE"; lineKey: string; note: string }
  | { type: "REMOVE_ITEM"; lineKey: string }
  | { type: "CLEAR" };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "ADD_ITEM": {
      // Beda Lapak dari cart aktif -> reset (MVP tidak punya Keranjang lintas-Lapak).
      const base =
        state.stallSlug && state.stallSlug !== action.stallSlug
          ? EMPTY_CART_STATE
          : state;
      // Kunci baris = productId + pilihan varian (lihat cartLineKey) — dua
      // pilihan varian berbeda untuk Item yang sama TIDAK boleh tergabung.
      const newLineKey = cartLineKey(action.item);
      const existing = base.items.find(
        (item) => cartLineKey(item) === newLineKey,
      );
      const items = existing
        ? base.items.map((item) =>
            cartLineKey(item) === newLineKey
              ? {
                  ...item,
                  qty: item.qty + action.item.qty,
                  note: action.item.note,
                }
              : item,
          )
        : [...base.items, action.item];
      return { stallSlug: action.stallSlug, items };
    }
    case "UPDATE_QTY": {
      if (action.qty <= 0) {
        const items = state.items.filter(
          (item) => cartLineKey(item) !== action.lineKey,
        );
        return { stallSlug: items.length > 0 ? state.stallSlug : null, items };
      }
      return {
        ...state,
        items: state.items.map((item) =>
          cartLineKey(item) === action.lineKey
            ? { ...item, qty: action.qty }
            : item,
        ),
      };
    }
    case "UPDATE_NOTE":
      return {
        ...state,
        items: state.items.map((item) =>
          cartLineKey(item) === action.lineKey
            ? { ...item, note: action.note }
            : item,
        ),
      };
    case "REMOVE_ITEM": {
      const items = state.items.filter(
        (item) => cartLineKey(item) !== action.lineKey,
      );
      return { stallSlug: items.length > 0 ? state.stallSlug : null, items };
    }
    case "CLEAR":
      return EMPTY_CART_STATE;
    default:
      return state;
  }
}

type CartContextValue = {
  stallSlug: string | null;
  items: CartItem[];
  itemCount: number;
  subtotalDisplay: number;
  /**
   * Metode pembayaran Lapak aktif — dipakai copy checkout ("Biaya Layanan"
   * disembunyikan utk `qris_pribadi`, lihat CartSummary/CheckoutForm).
   * Default `"gateway"` sebelum termuat/tidak ada Lapak aktif (paling aman).
   */
  paymentMode: MerchantPaymentMode;
  /**
   * Status buka/tutup Lapak aktif — dipakai `CheckoutGate` mengunci Checkout.
   * Default `true` (paling tidak menghalangi) sebelum termuat/tidak ada Lapak aktif.
   */
  isOpen: boolean;
  /** Jadwal Lapak aktif buka lagi (ISO string) — null kalau tidak diketahui. */
  reopensAt: string | null;
  addItem: (stallSlug: string, item: CartItem) => void;
  updateQty: (lineKey: string, qty: number) => void;
  updateNote: (lineKey: string, note: string) => void;
  removeItem: (lineKey: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, EMPTY_CART_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [paymentMode, setPaymentMode] =
    useState<MerchantPaymentMode>("gateway");
  const [isOpen, setIsOpen] = useState(true);
  const [reopensAt, setReopensAt] = useState<string | null>(null);

  // Baca localStorage setelah mount (bukan di initializer) supaya tidak
  // memicu hydration mismatch di Next.js App Router.
  useEffect(() => {
    dispatch({ type: "HYDRATE", state: loadCart() });
    setHydrated(true);
  }, []);

  // Baru mulai menulis setelah hydrate pertama selesai — kalau tidak,
  // render awal (state kosong) akan menimpa cart tersimpan sebelum
  // sempat dibaca.
  useEffect(() => {
    if (!hydrated) return;
    saveCart(state);
  }, [state, hydrated]);

  // Lapak aktif berubah -> muat ulang metode pembayarannya (dipakai copy
  // checkout, lihat CartSummary/CheckoutForm). Default "gateway" (paling
  // aman) sampai termuat atau kalau tidak ada Lapak aktif.
  useEffect(() => {
    if (!state.stallSlug) {
      setPaymentMode("gateway");
      return;
    }
    let cancelled = false;
    getMerchantPaymentMode(state.stallSlug).then((result) => {
      if (!cancelled) setPaymentMode(result?.paymentMode ?? "gateway");
    });
    return () => {
      cancelled = true;
    };
  }, [state.stallSlug]);

  // Lapak aktif berubah -> muat ulang status buka/tutupnya (dipakai
  // CheckoutGate mengunci Checkout). Default buka (paling tidak menghalangi)
  // sampai termuat atau kalau tidak ada Lapak aktif.
  useEffect(() => {
    if (!state.stallSlug) {
      setIsOpen(true);
      setReopensAt(null);
      return;
    }
    let cancelled = false;
    getStallOpenState(state.stallSlug).then((result) => {
      if (cancelled) return;
      setIsOpen(result?.isOpen ?? true);
      setReopensAt(result?.reopensAt ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [state.stallSlug]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = state.items.reduce((sum, item) => sum + item.qty, 0);
    const subtotalDisplay = state.items.reduce(
      (sum, item) => sum + item.price * item.qty,
      0,
    );
    return {
      stallSlug: state.stallSlug,
      items: state.items,
      itemCount,
      subtotalDisplay,
      paymentMode,
      isOpen,
      reopensAt,
      addItem: (stallSlug, item) =>
        dispatch({ type: "ADD_ITEM", stallSlug, item }),
      updateQty: (lineKey, qty) =>
        dispatch({ type: "UPDATE_QTY", lineKey, qty }),
      updateNote: (lineKey, note) =>
        dispatch({ type: "UPDATE_NOTE", lineKey, note }),
      removeItem: (lineKey) => dispatch({ type: "REMOVE_ITEM", lineKey }),
      clearCart: () => dispatch({ type: "CLEAR" }),
    };
  }, [state, paymentMode, isOpen, reopensAt]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart harus dipakai di dalam <CartProvider>.");
  return ctx;
}
