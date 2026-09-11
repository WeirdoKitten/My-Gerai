"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/utils/money";
import {
  MERCHANT_ACTION_LABEL_ID,
  nextMerchantStatus,
  ORDER_STATUS_LABEL_ID,
} from "@/lib/utils/order-status";
import { markQrisPribadiOrderPaid, updateOrderStatus } from "@/server/orders";
import type { MerchantOrderListItem } from "@/types/order";

export function MerchantOrderCard({
  order,
  onUpdated,
}: {
  order: MerchantOrderListItem;
  onUpdated: () => void;
}) {
  const { showToast } = useToast();
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
    showToast(
      `Pesanan ${order.orderCode} ditandai ${ORDER_STATUS_LABEL_ID[upcoming]}`,
    );
    onUpdated();
  }

  // Pesanan QRIS pribadi tanpa webhook gateway — Pedagang konfirmasi manual
  // setelah melihat uang masuk ke rekening/e-wallet pribadinya sendiri.
  async function handleMarkPaid() {
    setSubmitting(true);
    setError(null);
    const result = await markQrisPribadiOrderPaid(order.id);
    if (!result.ok) {
      setError(result.message ?? "Gagal menandai lunas.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    showToast(`Pesanan ${order.orderCode} ditandai lunas`);
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
      {order.awaitingManualConfirmation ? (
        <>
          <p className="text-xs text-ink-muted">
            Pesanan QRIS pribadi — tandai lunas setelah kamu menerima
            pembayarannya.
          </p>
          <Button
            type="button"
            fullWidth
            loading={submitting}
            onClick={handleMarkPaid}
          >
            {submitting ? "Memproses..." : "Tandai Lunas"}
          </Button>
        </>
      ) : actionLabel ? (
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
