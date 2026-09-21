"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReceiptIcon } from "@/components/ui/icons";
import { useSound } from "@/lib/sound/sound-context";
import { listMerchantOrders } from "@/server/orders";
import type { MerchantOrderListItem } from "@/types/order";
import { MerchantOrderCard } from "./MerchantOrderCard";

const POLL_INTERVAL_MS = 5000;

export function MerchantOrderList({
  initialOrders,
  initialTotalActive,
}: {
  initialOrders: MerchantOrderListItem[];
  initialTotalActive: number;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [totalActive, setTotalActive] = useState(initialTotalActive);
  const { playOrderChime } = useSound();
  // Pesanan yang sudah "dilihat" (termasuk isi awal SSR) — dipakai deteksi
  // Pesanan baru murni lewat `id`, bukan posisi array (daftar diurut FIFO,
  // Pesanan terbaru belum tentu ada di index 0).
  const seenIdsRef = useRef(new Set(initialOrders.map((order) => order.id)));

  const refresh = useCallback(async () => {
    const latest = await listMerchantOrders();
    const hasNewOrder = latest.orders.some(
      (order) => !seenIdsRef.current.has(order.id),
    );
    seenIdsRef.current = new Set(latest.orders.map((order) => order.id));
    if (hasNewOrder) playOrderChime();
    setOrders(latest.orders);
    setTotalActive(latest.totalActive);
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

  const hiddenCount = totalActive - orders.length;

  return (
    <div className="flex flex-col gap-3">
      {hiddenCount > 0 ? (
        <Alert tone="info">
          Menampilkan {orders.length} dari {totalActive} Pesanan aktif —
          selesaikan yang tertua dulu supaya {hiddenCount} Pesanan lain muncul.
        </Alert>
      ) : null}
      {orders.map((order) => (
        <MerchantOrderCard key={order.id} order={order} onUpdated={refresh} />
      ))}
    </div>
  );
}
