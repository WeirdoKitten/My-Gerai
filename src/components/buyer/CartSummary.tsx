"use client";

import { Card } from "@/components/ui/Card";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { useCart } from "@/lib/cart/cart-context";
import { cartLineKey } from "@/lib/cart/line-key";
import { formatRupiah } from "@/lib/utils/money";

export function CartSummary({
  platformFeeAmount,
}: {
  platformFeeAmount: number;
}) {
  const { items, subtotalDisplay, paymentMode, updateQty, removeItem } =
    useCart();
  const isQrisPribadi = paymentMode === "qris_pribadi";
  // QRIS pribadi: Pembeli bayar LANGSUNG ke Pedagang, cuma sebesar subtotal —
  // Biaya Layanan tidak bisa di-on-top di QRIS statis, ditagih belakangan ke
  // Pedagang lewat tagihan mingguan (lihat src/lib/billing/).
  const total = isQrisPribadi
    ? subtotalDisplay
    : subtotalDisplay + platformFeeAmount;

  return (
    <Card pad="none">
      <ul className="divide-y divide-line">
        {items.map((item) => {
          const lineKey = cartLineKey(item);
          return (
            <li key={lineKey} className="flex flex-col gap-2.5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{item.name}</p>
                  <p className="text-sm tabular-nums text-ink-muted">
                    {formatRupiah(item.price)}
                  </p>
                  {item.variantSelections.length > 0 ? (
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {item.variantSelections
                        .map((s) => `${s.groupName}: ${s.optionName}`)
                        .join(" · ")}
                    </p>
                  ) : null}
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
                  onDecrement={() => updateQty(lineKey, item.qty - 1)}
                  onIncrement={() => updateQty(lineKey, item.qty + 1)}
                />
                <button
                  type="button"
                  onClick={() => removeItem(lineKey)}
                  className="text-sm font-semibold text-danger transition-colors hover:text-danger-hover"
                >
                  Hapus
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-1.5 border-t border-line p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-muted">Subtotal</span>
          <span className="tabular-nums text-ink">
            {formatRupiah(subtotalDisplay)}
          </span>
        </div>
        {isQrisPribadi ? null : (
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">Biaya Layanan</span>
            <span className="tabular-nums text-ink">
              {formatRupiah(platformFeeAmount)}
            </span>
          </div>
        )}
        <div className="mt-1 flex items-center justify-between border-t border-line pt-2">
          <span className="font-semibold text-ink">Total</span>
          <span className="font-bold tabular-nums text-ink">
            {formatRupiah(total)}
          </span>
        </div>
      </div>
      <p className="px-4 pb-4 text-xs text-ink-muted">
        {isQrisPribadi
          ? "Kamu membayar langsung ke QRIS milik Pedagang. Total dihitung ulang di server saat Pesanan dibuat."
          : "Biaya Layanan untuk memakai layanan pesan lewat MyGerai. Total dihitung ulang di server saat Pesanan dibuat."}
      </p>
    </Card>
  );
}
