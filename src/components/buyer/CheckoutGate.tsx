"use client";

import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { CartIcon } from "@/components/ui/icons";
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

  return <>{children}</>;
}
