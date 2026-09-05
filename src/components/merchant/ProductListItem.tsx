"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/utils/money";
import { setProductStatus } from "@/server/products";
import type { MerchantProductView } from "@/types/product";
import { ProductForm } from "./ProductForm";

export function ProductListItem({
  product,
  onChanged,
}: {
  product: MerchantProductView;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [toggling, setToggling] = useState(false);

  if (editing) {
    return (
      <ProductForm
        product={product}
        onDone={() => {
          setEditing(false);
          onChanged();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  async function handleToggle() {
    setToggling(true);
    const nextStatus =
      product.status === "available" ? "sold_out" : "available";
    await setProductStatus(product.id, nextStatus);
    setToggling(false);
    onChanged();
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
          {product.name}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {formatRupiah(product.price)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            product.status === "available"
              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
              : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          {product.status === "available" ? "Tersedia" : "Habis"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm text-zinc-500 underline dark:text-zinc-400"
        >
          Ubah
        </button>
      </div>
    </div>
  );
}
