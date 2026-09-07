"use client";

import { Card } from "@/components/ui/Card";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { useCart } from "@/lib/cart/cart-context";
import { formatRupiah } from "@/lib/utils/money";

export function CartSummary() {
  const { items, subtotalDisplay, updateQty, removeItem } = useCart();

  return (
    <Card pad="none">
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <li key={item.productId} className="flex flex-col gap-2.5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{item.name}</p>
                <p className="text-sm tabular-nums text-ink-muted">
                  {formatRupiah(item.price)}
                </p>
                {item.note ? (
                  <p className="mt-0.5 text-sm text-ink-muted">
                    Catatan: {item.note}
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 font-semibold tabular-nums text-ink">
                {formatRupiah(item.price * item.qty)}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <QuantityStepper
                value={item.qty}
                min={1}
                max={50}
                label={`jumlah ${item.name}`}
                onDecrement={() => updateQty(item.productId, item.qty - 1)}
                onIncrement={() => updateQty(item.productId, item.qty + 1)}
              />
              <button
                type="button"
                onClick={() => removeItem(item.productId)}
                className="text-sm font-semibold text-danger transition-colors hover:text-danger-hover"
              >
                Hapus
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-line p-4">
        <span className="font-semibold text-ink">Subtotal</span>
        <span className="font-bold tabular-nums text-ink">
          {formatRupiah(subtotalDisplay)}
        </span>
      </div>
      <p className="px-4 pb-4 text-xs text-ink-muted">
        Total akhir (termasuk Biaya Layanan) dihitung ulang di halaman
        berikutnya.
      </p>
    </Card>
  );
}
