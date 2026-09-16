"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PillOption } from "@/components/ui/PillOption";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { useToast } from "@/components/ui/Toast";
import { useCart } from "@/lib/cart/cart-context";
import type { CartItemVariantSelection } from "@/lib/cart/types";
import { formatRupiah } from "@/lib/utils/money";
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
  // groupId -> optionId
  const [selections, setSelections] = useState<Record<string, string>>({});

  const allGroupsSelected = product.variantGroups.every(
    (group) => selections[group.id] != null,
  );
  const priceDelta = product.variantGroups.reduce((sum, group) => {
    const option = group.options.find((o) => o.id === selections[group.id]);
    return sum + (option?.priceDelta ?? 0);
  }, 0);
  const effectivePrice = product.price + priceDelta;

  function handleAdd() {
    const variantSelections: CartItemVariantSelection[] =
      product.variantGroups.map((group) => {
        const option = group.options.find((o) => o.id === selections[group.id]);
        // Aman: tombol "Tambah" disabled sampai allGroupsSelected true.
        return {
          groupId: group.id,
          groupName: group.name,
          optionId: option?.id ?? "",
          optionName: option?.name ?? "",
          priceDelta: option?.priceDelta ?? 0,
        };
      });

    addItem(stallSlug, {
      productId: product.id,
      name: product.name,
      price: effectivePrice,
      photoUrl: product.photoUrl,
      qty,
      note,
      variantSelections,
    });
    showToast(
      qty > 1
        ? `${qty} ${product.name} ditambahkan`
        : `${product.name} ditambahkan`,
    );
    setQty(1);
    setNote("");
    setSelections({});
  }

  return (
    <div className="flex flex-col gap-3">
      {product.variantGroups.map((group) => (
        <div key={group.id} className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-ink">{group.name}</p>
          <div className="flex flex-wrap gap-2">
            {group.options.map((option) => (
              <PillOption
                key={option.id}
                selected={selections[group.id] === option.id}
                onClick={() =>
                  setSelections((prev) => ({
                    ...prev,
                    [group.id]: option.id,
                  }))
                }
              >
                {option.name}
                {option.priceDelta !== 0
                  ? ` (${option.priceDelta > 0 ? "+" : ""}${formatRupiah(option.priceDelta)})`
                  : ""}
              </PillOption>
            ))}
          </div>
        </div>
      ))}

      {product.variantGroups.length > 0 ? (
        <p className="text-sm font-semibold text-ink">
          Total: {formatRupiah(effectivePrice)}
        </p>
      ) : null}

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
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={!allGroupsSelected}
          className="flex-1"
        >
          Tambah
        </Button>
      </div>
    </div>
  );
}
