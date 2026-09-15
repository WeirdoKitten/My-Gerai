"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReceiptIcon } from "@/components/ui/icons";
import { useSound } from "@/lib/sound/sound-context";
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
  const { playOrderChime } = useSound();
  // Pesanan yang sudah "dilihat" (termasuk isi awal SSR) — dipakai deteksi
  // Pesanan baru murni lewat `id`, bukan posisi array (daftar diurut FIFO,
  // Pesanan terbaru belum tentu ada di index 0).
  const seenIdsRef = useRef(new Set(initialOrders.map((order) => order.id)));

  const refresh = useCallback(async () => {
    const latest = await listMerchantOrders();
    const hasNewOrder = latest.some(
      (order) => !seenIdsRef.current.has(order.id),
    );
    seenIdsRef.current = new Set(latest.map((order) => order.id));
    if (hasNewOrder) playOrderChime();
    setOrders(latest);
  }, [playOrderChime]);

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
    <div className="flex flex-col gap-3">
      {orders.map((order) => (
        <MerchantOrderCard key={order.id} order={order} onUpdated={refresh} />
      ))}
    </div>
  );
}
