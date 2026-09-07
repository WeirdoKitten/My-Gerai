"use client";

import Image from "next/image";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ImageOffIcon } from "@/components/ui/icons";
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

  const available = product.status === "available";

  return (
    <Card
      pad="sm"
      className={cn("flex items-center gap-3", !available && "opacity-70")}
    >
      {product.photoUrl ? (
        <Image
          src={product.photoUrl}
          alt={product.name}
          width={48}
          height={48}
          className="size-12 shrink-0 rounded-control object-cover"
        />
      ) : (
        <div className="flex size-12 shrink-0 items-center justify-center rounded-control bg-brand-tint text-brand">
          <ImageOffIcon className="size-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{product.name}</p>
        <p className="text-sm tabular-nums text-ink-muted">
          {formatRupiah(product.price)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50",
            available
              ? "bg-success-bg text-success"
              : "bg-neutral-bg text-ink-muted",
          )}
        >
          {available ? "Tersedia" : "Habis"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg px-2.5 py-1 text-sm font-semibold text-brand-strong transition-colors hover:bg-brand-tint"
        >
          Ubah
        </button>
      </div>
    </Card>
  );
}
