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
import { loadCart, saveCart } from "./storage";
import { type CartItem, type CartState, EMPTY_CART_STATE } from "./types";

type CartAction =
  | { type: "HYDRATE"; state: CartState }
  | { type: "ADD_ITEM"; stallSlug: string; item: CartItem }
  | { type: "UPDATE_QTY"; productId: string; qty: number }
  | { type: "UPDATE_NOTE"; productId: string; note: string }
  | { type: "REMOVE_ITEM"; productId: string }
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
      const existing = base.items.find(
        (item) => item.productId === action.item.productId,
      );
      const items = existing
        ? base.items.map((item) =>
            item.productId === action.item.productId
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
          (item) => item.productId !== action.productId,
        );
        return { stallSlug: items.length > 0 ? state.stallSlug : null, items };
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.productId === action.productId
            ? { ...item, qty: action.qty }
            : item,
        ),
      };
    }
    case "UPDATE_NOTE":
      return {
        ...state,
        items: state.items.map((item) =>
          item.productId === action.productId
            ? { ...item, note: action.note }
            : item,
        ),
      };
    case "REMOVE_ITEM": {
      const items = state.items.filter(
        (item) => item.productId !== action.productId,
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
  addItem: (stallSlug: string, item: CartItem) => void;
  updateQty: (productId: string, qty: number) => void;
  updateNote: (productId: string, note: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, EMPTY_CART_STATE);
  const [hydrated, setHydrated] = useState(false);

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
      addItem: (stallSlug, item) =>
        dispatch({ type: "ADD_ITEM", stallSlug, item }),
      updateQty: (productId, qty) =>
        dispatch({ type: "UPDATE_QTY", productId, qty }),
      updateNote: (productId, note) =>
        dispatch({ type: "UPDATE_NOTE", productId, note }),
      removeItem: (productId) => dispatch({ type: "REMOVE_ITEM", productId }),
      clearCart: () => dispatch({ type: "CLEAR" }),
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart harus dipakai di dalam <CartProvider>.");
  return ctx;
}
