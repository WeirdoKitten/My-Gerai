"use client";

import type { ReactNode } from "react";
import { useCart } from "@/lib/cart/cart-context";

export function CheckoutGate({ children }: { children: ReactNode }) {
  const cart = useCart();

  if (!cart.stallSlug || cart.items.length === 0) {
    return (
      <p className="text-zinc-500 dark:text-zinc-400">
        Keranjang kosong. Silakan pindai QR Lapak dulu untuk memilih Item.
      </p>
    );
  }

  return <>{children}</>;
}
