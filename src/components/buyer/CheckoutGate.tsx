"use client";

import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { CartIcon, StoreIcon } from "@/components/ui/icons";
import { useCart } from "@/lib/cart/cart-context";

export function CheckoutGate({ children }: { children: ReactNode }) {
  const cart = useCart();

  if (!cart.stallSlug || cart.items.length === 0) {
    return (
      <EmptyState
        icon={<CartIcon className="size-10" />}
        title="Keranjang masih kosong"
        description="Pindai QR di Lapak untuk melihat menu dan memilih Item."
      />
    );
  }

  // Pre-order untuk hari lain -- tetap bisa dipesan walau Lapak tutup sekarang.
  if (!cart.isOpen && !cart.isPreOrderCart) {
    return (
      <EmptyState
        icon={<StoreIcon className="size-10" />}
        title="Lapak sedang tutup"
        description="Coba lagi nanti atau tunggu Lapak buka kembali."
      />
    );
  }

  return <>{children}</>;
}
