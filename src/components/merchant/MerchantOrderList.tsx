"use client";

import { useCallback, useEffect, useState } from "react";
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
      <p className="text-zinc-500 dark:text-zinc-400">
        Belum ada Pesanan masuk.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {orders.map((order) => (
        <MerchantOrderCard key={order.id} order={order} onUpdated={refresh} />
      ))}
    </div>
  );
}
