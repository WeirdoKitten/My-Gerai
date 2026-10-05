"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReceiptIcon } from "@/components/ui/icons";
import { wibDayKey } from "@/lib/report/period";
import { useSound } from "@/lib/sound/sound-context";
import { formatShortDayKey } from "@/lib/utils/datetime";
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
  const nowOrders = orders.filter((order) => !order.scheduledFor);
  // Pre-order diurut jadwal terdekat (bukan urutan masuk) dan dikelompokkan
  // per tanggal -- yang dikerjakan duluan yang jadwalnya paling dekat.
  const preOrders = orders
    .filter((order) => order.scheduledFor)
    .sort(
      (a, b) =>
        new Date(a.scheduledFor ?? 0).getTime() -
        new Date(b.scheduledFor ?? 0).getTime(),
    );
  const preOrderGroups: Array<{ dayKey: string; orders: typeof preOrders }> =
    [];
  for (const order of preOrders) {
    const dayKey = wibDayKey(new Date(order.scheduledFor ?? 0));
    const last = preOrderGroups.at(-1);
    if (last?.dayKey === dayKey) last.orders.push(order);
    else preOrderGroups.push({ dayKey, orders: [order] });
  }

  return (
    <div className="flex flex-col gap-3">
      {hiddenCount > 0 ? (
        <Alert tone="info">
          Menampilkan {orders.length} dari {totalActive} Pesanan aktif.
          Selesaikan yang tertua dulu supaya {hiddenCount} Pesanan lain muncul.
        </Alert>
      ) : null}
      {preOrders.length > 0 && nowOrders.length > 0 ? (
        <h2 className="text-sm font-semibold text-ink-muted">
          Pesanan sekarang
        </h2>
      ) : null}
      {nowOrders.map((order) => (
        <MerchantOrderCard key={order.id} order={order} onUpdated={refresh} />
      ))}
      {preOrderGroups.length > 0 ? (
        <h2 className="mt-2 text-sm font-semibold text-ink-muted">
          Pre-order ({preOrders.length})
        </h2>
      ) : null}
      {preOrderGroups.map((group) => (
        <div key={group.dayKey} className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-info">
            {formatShortDayKey(group.dayKey)}
          </p>
          {group.orders.map((order) => (
            <MerchantOrderCard
              key={order.id}
              order={order}
              onUpdated={refresh}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
