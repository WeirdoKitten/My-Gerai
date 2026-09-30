import { Card } from "@/components/ui/Card";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { formatSchedule } from "@/lib/utils/datetime";
import { formatRupiah } from "@/lib/utils/money";
import { orderGrandTotal } from "@/lib/utils/order-calc";
import { DELIVERY_FAILURE_REASON_LABEL_ID } from "@/lib/utils/order-status";
import type { AdminOrderListItem } from "@/types/order";

export function TransactionList({ orders }: { orders: AdminOrderListItem[] }) {
  if (orders.length === 0) {
    return <p className="text-sm text-ink-muted">Belum ada Pesanan.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {orders.map((order) => (
        <Card
          key={order.id}
          pad="sm"
          className="flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">
              <span className="tabular-nums">{order.orderCode}</span> ·{" "}
              {order.stallName}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted">
              <span className="truncate">{order.buyerName}</span>
              <OrderStatusBadge status={order.status} />
            </div>
            {order.deliveryFailureReason ? (
              <p className="mt-0.5 truncate text-xs text-danger">
                {DELIVERY_FAILURE_REASON_LABEL_ID[order.deliveryFailureReason]}
                {order.deliveryFailureNote
                  ? ` (${order.deliveryFailureNote})`
                  : ""}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="font-semibold tabular-nums text-ink">
              {formatRupiah(orderGrandTotal(order))}
            </p>
            <p className="text-xs tabular-nums text-ink-muted">
              Item {formatRupiah(order.subtotal)} · Fee{" "}
              {formatRupiah(order.platformFeeSnapshot)}
              {order.fulfillmentMethod === "antar"
                ? ` · Ongkir ${formatRupiah(order.deliveryFeeSnapshot)}`
                : ""}
            </p>
            {order.scheduledFor ? (
              <p className="text-xs font-semibold text-info">
                Pre-order · {formatSchedule(new Date(order.scheduledFor))}
              </p>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}
