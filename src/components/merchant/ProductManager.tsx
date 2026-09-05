"use client";

import { useState } from "react";
import { listMerchantProducts } from "@/server/products";
import type { MerchantProductView } from "@/types/product";
import { ProductForm } from "./ProductForm";
import { ProductListItem } from "./ProductListItem";

export function ProductManager({
  initialProducts,
}: {
  initialProducts: MerchantProductView[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    const latest = await listMerchantProducts();
    setProducts(latest);
  }

  return (
    <div className="flex flex-col gap-4">
      {showForm ? (
        <ProductForm
          onDone={async () => {
            setShowForm(false);
            await refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="h-10 rounded-md border border-zinc-300 text-sm font-medium dark:border-zinc-700"
        >
          + Tambah Item
        </button>
      )}
      <div className="flex flex-col gap-2">
        {products.map((product) => (
          <ProductListItem
            key={product.id}
            product={product}
            onChanged={refresh}
          />
        ))}
      </div>
    </div>
  );
}
