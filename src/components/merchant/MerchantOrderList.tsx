"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReceiptIcon } from "@/components/ui/icons";
import { listMerchantOrders } from "@/server/orders";
import type { MerchantOrderListItem } from "@/types/order";
import { MerchantOrderCard } from "./MerchantOrderCard";

const POLL_INTERVAL_MS = 5000;

export function MerchantOrderList({
  initialOrders,
}: {
  initialOrders: MerchantOrderListItem[];
}) {
  const [orders, setOrders] = useState(initialOrders);

  const refresh = useCallback(async () => {
    const latest = await listMerchantOrders();
    setOrders(latest);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [refresh]);

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptIcon className="size-10" />}
        title="Belum ada Pesanan masuk"
        description="Pesanan yang sudah dibayar muncul di sini otomatis."
      />
    );
  }

  return (
    <div className="grid items-start gap-3 lg:grid-cols-2">
      {orders.map((order) => (
        <MerchantOrderCard key={order.id} order={order} onUpdated={refresh} />
      ))}
    </div>
  );
}
