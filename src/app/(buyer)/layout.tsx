import type { ReactNode } from "react";
import { Wordmark } from "@/components/ui/Wordmark";
import { CartProvider } from "@/lib/cart/cart-context";

export default function BuyerLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="border-b border-line/70">
          <div className="mx-auto flex max-w-3xl items-center justify-center px-4 py-3">
            <Wordmark className="text-sm" />
          </div>
        </header>
        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </div>
      </div>
    </CartProvider>
  );
}
