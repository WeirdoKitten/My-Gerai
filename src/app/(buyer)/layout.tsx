import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { Wordmark } from "@/components/ui/Wordmark";
import { CartProvider } from "@/lib/cart/cart-context";

export default function BuyerLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CartProvider>
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
          <div className="flex items-center justify-center border-b border-line/70 py-3">
            <Wordmark className="text-sm" />
          </div>
          <div className="flex-1 px-4 py-5">{children}</div>
        </div>
      </CartProvider>
    </ToastProvider>
  );
}
