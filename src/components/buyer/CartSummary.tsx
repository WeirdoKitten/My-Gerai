"use client";

import { useCart } from "@/lib/cart/cart-context";
import { formatRupiah } from "@/lib/utils/money";

export function CartSummary() {
  const { items, subtotalDisplay, updateQty, removeItem } = useCart();

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div
          key={item.productId}
          className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
              {item.name}
            </p>
            {item.note ? (
              <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                Catatan: {item.note}
              </p>
            ) : null}
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {formatRupiah(item.price)} x {item.qty}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateQty(item.productId, item.qty - 1)}
              className="h-8 w-8 rounded-md border border-zinc-300 text-lg leading-none dark:border-zinc-700"
              aria-label={`Kurangi jumlah ${item.name}`}
            >
              −
            </button>
            <span className="w-6 text-center">{item.qty}</span>
            <button
              type="button"
              onClick={() => updateQty(item.productId, item.qty + 1)}
              className="h-8 w-8 rounded-md border border-zinc-300 text-lg leading-none dark:border-zinc-700"
              aria-label={`Tambah jumlah ${item.name}`}
            >
              +
            </button>
            <button
              type="button"
              onClick={() => removeItem(item.productId)}
              className="text-sm text-red-600 dark:text-red-400"
            >
              Hapus
            </button>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1 font-semibold text-zinc-900 dark:text-zinc-50">
        <span>Subtotal</span>
        <span>{formatRupiah(subtotalDisplay)}</span>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Total akhir (termasuk Biaya Layanan) dihitung ulang di halaman
        berikutnya.
      </p>
    </div>
  );
}
