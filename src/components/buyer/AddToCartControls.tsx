"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PillOption } from "@/components/ui/PillOption";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { useToast } from "@/components/ui/Toast";
import { useCart } from "@/lib/cart/cart-context";
import type { CartItemVariantSelection } from "@/lib/cart/types";
import { formatRupiah } from "@/lib/utils/money";
import type { BuyerProductView } from "@/types/product";

/**
 * Kontrol tambah ke Keranjang di kartu Item halaman menu. Item TANPA varian:
 * catatan + jumlah + tombol langsung di kartu. Item DENGAN varian: kartu cuma
 * menampilkan tombol "Tambah", pilihan varian muncul di popup saat ditekan
 * (2026-09-30) supaya kartu menu tetap ringkas.
 */
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
  const [pickerOpen, setPickerOpen] = useState(false);

  const hasVariants = product.variantGroups.length > 0;
  const allGroupsSelected = product.variantGroups.every(
    (group) => selections[group.id] != null,
  );
  const priceDelta = product.variantGroups.reduce((sum, group) => {
    const option = group.options.find((o) => o.id === selections[group.id]);
    return sum + (option?.priceDelta ?? 0);
  }, 0);
  const effectivePrice = product.price + priceDelta;

  function reset() {
    setQty(1);
    setNote("");
    setSelections({});
  }

  function handleAdd() {
    const variantSelections: CartItemVariantSelection[] =
      product.variantGroups.map((group) => {
        const option = group.options.find((o) => o.id === selections[group.id]);
        // Aman: tombol tambah disabled sampai allGroupsSelected true.
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
    reset();
    setPickerOpen(false);
  }

  const noteInput = (
    <Input
      type="text"
      inputSize="sm"
      value={note}
      onChange={(e) => setNote(e.target.value)}
      placeholder="Catatan (opsional)"
      aria-label={`Catatan untuk ${product.name}`}
      maxLength={200}
    />
  );
  const qtyStepper = (
    <QuantityStepper
      value={qty}
      min={1}
      max={50}
      label={`jumlah ${product.name}`}
      onDecrement={() => setQty((q) => Math.max(1, q - 1))}
      onIncrement={() => setQty((q) => Math.min(50, q + 1))}
    />
  );

  if (!hasVariants) {
    return (
      <div className="flex flex-col gap-3">
        {noteInput}
        <div className="flex items-center gap-2">
          {qtyStepper}
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            className="flex-1"
          >
            Tambah
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        fullWidth
        onClick={() => setPickerOpen(true)}
      >
        Tambah
      </Button>
      <Modal
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          reset();
        }}
        title={product.name}
      >
        <div className="flex flex-col gap-4">
          {product.variantGroups.map((group) => (
            <div key={group.id} className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-ink">
                {group.name}{" "}
                <span className="font-normal text-ink-muted">(pilih 1)</span>
              </p>
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
          {noteInput}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink">Jumlah</span>
            {qtyStepper}
          </div>
          <Button
            type="button"
            fullWidth
            onClick={handleAdd}
            disabled={!allGroupsSelected}
          >
            {allGroupsSelected
              ? `Tambah ke Keranjang · ${formatRupiah(effectivePrice * qty)}`
              : "Pilih dulu semua pilihan"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
