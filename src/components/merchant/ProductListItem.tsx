"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { PhotoThumb } from "@/components/ui/PhotoThumb";
import { cn } from "@/lib/utils/cn";
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

  async function handleToggle() {
    setToggling(true);
    const nextStatus =
      product.status === "available" ? "sold_out" : "available";
    await setProductStatus(product.id, nextStatus);
    setToggling(false);
    onChanged();
  }

  const available = product.status === "available";

  return (
    <Card pad="sm" className={cn("flex gap-3", !available && "opacity-70")}>
      <PhotoThumb src={product.photoUrl} alt={product.name} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{product.name}</p>
          <p className="text-sm tabular-nums text-ink-muted">
            {formatRupiah(product.price)}
            {product.stock !== null ? (
              <span
                className={cn(
                  "ml-2",
                  product.stock === 0 ? "font-semibold text-danger" : "",
                )}
              >
                · Stok {product.stock}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            role="switch"
            aria-checked={available}
            aria-label={`${product.name} tersedia`}
            onClick={handleToggle}
            disabled={toggling}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50",
              available
                ? "border-success/40 bg-success-bg text-success hover:bg-success/15"
                : "border-line bg-neutral-bg text-ink-muted hover:bg-line/50",
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full transition-colors",
                available ? "bg-success" : "bg-ink-muted/60",
              )}
            />
            {available ? "Tersedia" : "Habis"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-brand-strong transition-colors hover:bg-brand-tint"
          >
            Ubah
          </button>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Ubah Item">
        <ProductForm
          product={product}
          onDone={() => {
            setEditing(false);
            onChanged();
          }}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    </Card>
  );
}
