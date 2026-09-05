import { formatRupiah } from "@/lib/utils/money";
import { ORDER_STATUS_LABEL_ID } from "@/lib/utils/order-status";
import type { AdminOrderListItem } from "@/types/order";

export function TransactionList({ orders }: { orders: AdminOrderListItem[] }) {
  if (orders.length === 0) {
    return (
      <p className="text-zinc-500 dark:text-zinc-400">Belum ada Pesanan.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {orders.map((order) => (
        <div
          key={order.id}
          className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
        >
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              {order.orderCode} · {order.stallName}
            </p>
            <p className="text-zinc-500 dark:text-zinc-400">
              {order.buyerName} — {ORDER_STATUS_LABEL_ID[order.status]}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">
              {formatRupiah(order.subtotal)}
            </p>
            <p className="text-xs text-zinc-400">
              Fee: {formatRupiah(order.platformFeeSnapshot)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
