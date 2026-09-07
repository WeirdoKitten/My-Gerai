"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { formatRupiah } from "@/lib/utils/money";
import {
  MERCHANT_ACTION_LABEL_ID,
  nextMerchantStatus,
} from "@/lib/utils/order-status";
import { updateOrderStatus } from "@/server/orders";
import type { MerchantOrderListItem } from "@/types/order";

export function MerchantOrderCard({
  order,
  onUpdated,
}: {
  order: MerchantOrderListItem;
  onUpdated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upcoming = nextMerchantStatus(order.status);
  const actionLabel = upcoming ? MERCHANT_ACTION_LABEL_ID[order.status] : null;

  async function handleAdvance() {
    if (!upcoming) return;
    setSubmitting(true);
    setError(null);
    const result = await updateOrderStatus(order.id, upcoming);
    if (!result.ok) {
      setError(result.message ?? "Gagal memperbarui status.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onUpdated();
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-lg font-bold tracking-wide tabular-nums text-ink">
          {order.orderCode}
        </p>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="text-sm text-ink-muted">Atas nama {order.buyerName}</p>
      <ul className="flex flex-col gap-1 border-t border-line pt-3">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-2 text-sm">
            <span className="text-ink">
              {item.qty}× {item.productNameSnapshot}
              {item.note ? (
                <span className="text-ink-muted"> — {item.note}</span>
              ) : null}
            </span>
            <span className="tabular-nums text-ink-muted">
              {formatRupiah(item.priceSnapshot * item.qty)}
            </span>
          </li>
        ))}
      </ul>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {actionLabel ? (
        <Button
          type="button"
          fullWidth
          loading={submitting}
          onClick={handleAdvance}
        >
          {submitting ? "Memproses..." : actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}
