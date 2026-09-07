"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ImageOffIcon, PlusIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
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
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        variant="secondary"
        className="sm:self-start"
        onClick={() => setShowForm(true)}
      >
        <PlusIcon className="size-4" />
        Tambah Item
      </Button>

      {products.length === 0 ? (
        <EmptyState
          icon={<ImageOffIcon className="size-10" />}
          title="Belum ada Item"
          description="Tambahkan menu pertamamu supaya pembeli bisa memesan."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((product) => (
            <ProductListItem
              key={product.id}
              product={product}
              onChanged={refresh}
            />
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Tambah Item"
      >
        <ProductForm
          onDone={async () => {
            setShowForm(false);
            await refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}
