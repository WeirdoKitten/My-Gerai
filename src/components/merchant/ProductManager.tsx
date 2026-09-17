"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
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
  const [justAddedFirstProduct, setJustAddedFirstProduct] = useState(false);

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
            const wasFirstProduct = products.length === 0;
            setShowForm(false);
            await refresh();
            if (wasFirstProduct) setJustAddedFirstProduct(true);
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      <Modal
        open={justAddedFirstProduct}
        onClose={() => setJustAddedFirstProduct(false)}
        title="Item Pertama Ditambahkan"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Lapak kamu sekarang bisa menerima Pesanan. Cetak atau bagikan QR
            Menu supaya Pembeli bisa mulai memesan.
          </p>
          <div className="flex gap-2">
            <ButtonLink href="/dashboard/qr" fullWidth>
              Lihat QR Menu
            </ButtonLink>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setJustAddedFirstProduct(false)}
            >
              Lanjut
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
