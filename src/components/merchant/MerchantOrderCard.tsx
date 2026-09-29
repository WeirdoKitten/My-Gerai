"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
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
import { DeliveryFailedButton } from "./DeliveryFailedButton";
import { DeliveryInfo } from "./DeliveryInfo";
import { ReceiptButton } from "./ReceiptButton";

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

  const upcoming = nextMerchantStatus(order.status, order.fulfillmentMethod);
  const actionLabel = upcoming
    ? MERCHANT_ACTION_LABEL_ID[order.fulfillmentMethod][order.status]
    : null;

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
        <div className="flex items-center gap-1.5">
          {order.fulfillmentMethod === "antar" ? (
            <Badge tone="primary">Diantar</Badge>
          ) : null}
          <OrderStatusBadge status={order.status} />
        </div>
      </div>
      <p className="text-sm text-ink-muted">Atas nama {order.buyerName}</p>
      {order.delivery ? (
        <DeliveryInfo
          delivery={order.delivery}
          deliveryFee={order.deliveryFeeSnapshot}
        />
      ) : null}
      <ul className="flex flex-col gap-1 border-t border-line pt-3">
        {order.items.map((item) => (
          <li key={item.id} className="flex flex-col gap-0.5 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-ink">
                {item.qty}× {item.productNameSnapshot}
                {item.note ? (
                  <span className="text-ink-muted"> — {item.note}</span>
                ) : null}
              </span>
              <span className="tabular-nums text-ink-muted">
                {formatRupiah(item.priceSnapshot * item.qty)}
              </span>
            </div>
            {item.variantSelections.length > 0 ? (
              <p className="text-xs text-ink-muted">
                {item.variantSelections
                  .map((s) => `${s.groupNameSnapshot}: ${s.optionNameSnapshot}`)
                  .join(" · ")}
              </p>
            ) : null}
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
      ) : (
        <>
          <ReceiptButton orderId={order.id} orderCode={order.orderCode} />
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
          {order.status === "sedang_diantar" && order.delivery ? (
            <DeliveryFailedButton
              orderId={order.id}
              deliveryStartedAt={order.delivery.startedAt}
              onDone={() => {
                showToast(`Pesanan ${order.orderCode} ditandai gagal diantar`);
                onUpdated();
              }}
            />
          ) : null}
        </>
      )}
    </Card>
  );
}
