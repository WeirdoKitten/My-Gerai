"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart/cart-context";
import type { BuyerProductView } from "@/types/product";

export function AddToCartControls({
  product,
  stallSlug,
}: {
  product: BuyerProductView;
  stallSlug: string;
}) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [justAdded, setJustAdded] = useState(false);

  function handleAdd() {
    addItem(stallSlug, {
      productId: product.id,
      name: product.name,
      price: product.price,
      photoUrl: product.photoUrl,
      qty,
      note,
    });
    setJustAdded(true);
    setQty(1);
    setNote("");
    window.setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <div className="mt-1 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="h-8 w-8 rounded-md border border-zinc-300 text-lg leading-none dark:border-zinc-700"
          aria-label="Kurangi jumlah"
        >
          −
        </button>
        <span className="w-6 text-center">{qty}</span>
        <button
          type="button"
          onClick={() => setQty((q) => Math.min(50, q + 1))}
          className="h-8 w-8 rounded-md border border-zinc-300 text-lg leading-none dark:border-zinc-700"
          aria-label="Tambah jumlah"
        >
          +
        </button>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Catatan (opsional)"
          maxLength={200}
          className="min-w-0 flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="h-9 rounded-md bg-zinc-900 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
      >
        {justAdded ? "Ditambahkan ✓" : "Tambah ke Keranjang"}
      </button>
    </div>
  );
}
