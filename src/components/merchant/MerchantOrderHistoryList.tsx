import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HistoryIcon } from "@/components/ui/icons";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { formatDateTime, formatSchedule } from "@/lib/utils/datetime";
import { formatRupiah } from "@/lib/utils/money";
import { orderGrandTotal } from "@/lib/utils/order-calc";
import type { MerchantOrderHistoryItem } from "@/types/order";
import { DeliveryInfo } from "./DeliveryInfo";
import { ReceiptButton } from "./ReceiptButton";

export function MerchantOrderHistoryList({
  orders,
}: {
  orders: MerchantOrderHistoryItem[];
}) {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<HistoryIcon className="size-10" />}
        title="Belum ada riwayat"
        description="Pesanan yang sudah selesai atau kedaluwarsa akan tercatat di sini."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {orders.map((order) => (
        <MerchantOrderHistoryCard key={order.id} order={order} />
      ))}
    </div>
  );
}

function MerchantOrderHistoryCard({
  order,
}: {
  order: MerchantOrderHistoryItem;
}) {
  const timestamp = order.completedAt ?? order.paidAt ?? order.createdAt;
  // `gagal_diantar` tetap lunas (tanpa refund) — dana tetap hak Pedagang.
  const isPaid = order.status === "selesai" || order.status === "gagal_diantar";

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-lg font-bold tracking-wide tabular-nums text-ink">
          {order.orderCode}
        </p>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="text-sm text-ink-muted">
        Atas nama {order.buyerName} · {formatDateTime(timestamp)}
      </p>
      {order.eventName ? (
        <p className="text-sm font-semibold text-brand-strong">
          Event: {order.eventName}
        </p>
      ) : null}
      {order.scheduledFor ? (
        <p className="text-sm font-semibold text-info">
          Pre-order · jadwal {formatSchedule(new Date(order.scheduledFor))}
        </p>
      ) : null}
      {order.delivery ? (
        <DeliveryInfo delivery={order.delivery} showActions={false} />
      ) : null}
      <ul className="flex flex-col gap-1 border-t border-line pt-3">
        {order.items.map((item) => (
          <li key={item.id} className="flex flex-col gap-0.5 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-ink">
                {item.qty}× {item.productNameSnapshot}
                {item.note ? (
                  <span className="text-ink-muted"> ({item.note})</span>
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
      <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="text-sm text-ink-muted">
          {isPaid ? "Bagianmu" : "Nilai Pesanan"}
        </span>
        <span className="text-base font-bold tabular-nums text-ink">
          {formatRupiah(isPaid ? order.totalForMerchant : order.subtotal)}
        </span>
      </div>
      {isPaid ? (
        <p className="-mt-1 text-right text-xs tabular-nums text-ink-muted">
          Pembeli bayar {formatRupiah(orderGrandTotal(order))} · Biaya Layanan{" "}
          {formatRupiah(order.platformFeeSnapshot)}
          {order.deliveryFeeSnapshot > 0
            ? ` · Ongkir ${formatRupiah(order.deliveryFeeSnapshot)}`
            : ""}
        </p>
      ) : null}
      {isPaid ? (
        <ReceiptButton orderId={order.id} orderCode={order.orderCode} />
      ) : null}
    </Card>
  );
}
