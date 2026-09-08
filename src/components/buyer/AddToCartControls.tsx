"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { useToast } from "@/components/ui/Toast";
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
  const { showToast } = useToast();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  function handleAdd() {
    addItem(stallSlug, {
      productId: product.id,
      name: product.name,
      price: product.price,
      photoUrl: product.photoUrl,
      qty,
      note,
    });
    showToast(
      qty > 1
        ? `${qty} ${product.name} ditambahkan`
        : `${product.name} ditambahkan`,
    );
    setQty(1);
    setNote("");
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        type="text"
        inputSize="sm"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Catatan (opsional)"
        maxLength={200}
      />
      <div className="flex items-center gap-2">
        <QuantityStepper
          value={qty}
          min={1}
          max={50}
          onDecrement={() => setQty((q) => Math.max(1, q - 1))}
          onIncrement={() => setQty((q) => Math.min(50, q + 1))}
        />
        <Button type="button" size="sm" onClick={handleAdd} className="flex-1">
          Tambah
        </Button>
      </div>
    </div>
  );
}
