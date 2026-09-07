"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ImageOffIcon, PlusIcon } from "@/components/ui/icons";
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
    setProducts(await listMerchantProducts());
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2 sm:max-w-lg">
        {showForm ? (
          <ProductForm
            onDone={async () => {
              setShowForm(false);
              await refresh();
            }}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => setShowForm(true)}
          >
            <PlusIcon className="size-4" />
            Tambah Item
          </Button>
        )}
      </div>

      {products.length === 0 && !showForm ? (
        <div className="sm:col-span-2">
          <EmptyState
            icon={<ImageOffIcon className="size-10" />}
            title="Belum ada Item"
            description="Tambahkan menu pertamamu supaya pembeli bisa memesan."
          />
        </div>
      ) : (
        products.map((product) => (
          <ProductListItem
            key={product.id}
            product={product}
            onChanged={refresh}
          />
        ))
      )}
    </div>
  );
}
