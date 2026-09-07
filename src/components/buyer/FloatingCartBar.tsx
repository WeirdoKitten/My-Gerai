"use client";

import Link from "next/link";
import { ArrowRightIcon, CartIcon } from "@/components/ui/icons";
import { useCart } from "@/lib/cart/cart-context";
import { formatRupiah } from "@/lib/utils/money";

export function FloatingCartBar() {
  const { itemCount, subtotalDisplay } = useCart();

  if (itemCount === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-4">
      <Link
        href="/checkout"
        className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 rounded-full bg-brand-strong px-5 text-white shadow-card transition-colors hover:bg-brand-strong-hover"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <CartIcon className="size-5" />
          {itemCount} item
        </span>
        <span className="flex items-center gap-2 font-bold tabular-nums">
          {formatRupiah(subtotalDisplay)}
          <ArrowRightIcon className="size-4" />
        </span>
      </Link>
    </div>
  );
}
