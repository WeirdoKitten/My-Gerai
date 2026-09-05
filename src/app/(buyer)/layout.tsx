import type { ReactNode } from "react";
import { CartProvider } from "@/lib/cart/cart-context";

export default function BuyerLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <div className="mx-auto w-full max-w-md flex-1 px-4 py-6">{children}</div>
    </CartProvider>
  );
}
