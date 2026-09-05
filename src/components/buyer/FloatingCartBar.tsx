"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/cart-context";
import { formatRupiah } from "@/lib/utils/money";

export function FloatingCartBar() {
  const { itemCount, subtotalDisplay } = useCart();

  if (itemCount === 0) return null;

  return (
    <Link
      href="/checkout"
      className="fixed inset-x-4 bottom-4 mx-auto flex max-w-md items-center justify-between rounded-lg bg-zinc-900 px-4 py-3 text-white shadow-lg dark:bg-zinc-50 dark:text-zinc-900"
    >
      <span className="text-sm font-medium">{itemCount} Item di Keranjang</span>
      <span className="font-semibold">{formatRupiah(subtotalDisplay)}</span>
    </Link>
  );
}
