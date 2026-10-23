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
  isProxyStall = false,
}: {
  initialProducts: MerchantProductView[];
  /** Gerai Titipan: tanpa QR Menu, dipesan peserta lewat QR Event. */
  isProxyStall?: boolean;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [showForm, setShowForm] = useState(false);
  // Form dipasang ulang tiap dibuka: Modal tidak meng-unmount isinya, jadi
  // tanpa ini isian & status "Menyimpan..." Item sebelumnya ikut terbawa.
  const [formKey, setFormKey] = useState(0);
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
        onClick={() => {
          setFormKey((key) => key + 1);
          setShowForm(true);
        }}
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
          key={formKey}
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
            {isProxyStall
              ? "Gerai Titipan ini sekarang bisa dipesan peserta lewat QR Event."
              : "Lapak kamu sekarang bisa menerima Pesanan. Cetak atau bagikan QR Menu supaya Pembeli bisa mulai memesan."}
          </p>
          <div className="flex gap-2">
            <ButtonLink href={isProxyStall ? "/eo" : "/dashboard/qr"} fullWidth>
              {isProxyStall ? "Kembali ke Portal EO" : "Lihat QR Menu"}
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
