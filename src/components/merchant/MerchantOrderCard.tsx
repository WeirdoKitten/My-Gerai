"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/utils/money";
import {
  MERCHANT_ACTION_LABEL_ID,
  nextMerchantStatus,
  ORDER_STATUS_LABEL_ID,
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
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold tracking-wide text-zinc-900 dark:text-zinc-50">
          {order.orderCode}
        </p>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {ORDER_STATUS_LABEL_ID[order.status]}
        </span>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Atas nama: {order.buyerName}
      </p>
      <div className="flex flex-col gap-1">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>
              {item.qty}x {item.productNameSnapshot}
              {item.note ? ` (${item.note})` : ""}
            </span>
            <span>{formatRupiah(item.priceSnapshot * item.qty)}</span>
          </div>
        ))}
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      {actionLabel ? (
        <button
          type="button"
          onClick={handleAdvance}
          disabled={submitting}
          className="h-10 rounded-md bg-zinc-900 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {submitting ? "Memproses..." : actionLabel}
        </button>
      ) : null}
    </div>
  );
}
