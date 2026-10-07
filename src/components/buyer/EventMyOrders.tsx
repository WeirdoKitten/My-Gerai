"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { loadRecentOrders, type RecentOrder } from "@/lib/buyer/storage";
import type { OrderStatus } from "@/lib/utils/order-status";
import { getOrderStatusSummary } from "@/server/orders";

/**
 * "Pesanan kamu di event ini" — Pesanan dari perangkat ini (localStorage)
 * yang berasal dari event yang sama, supaya saat sesi oleh-oleh Pembeli
 * tinggal menunjukkan Kode Pesanan di tiap Gerai. Tersembunyi kalau kosong.
 */
export function EventMyOrders({ eventSlug }: { eventSlug: string }) {
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [statuses, setStatuses] = useState<Record<string, OrderStatus>>({});

  useEffect(() => {
    const mine = loadRecentOrders().filter(
      (order) => order.eventSlug === eventSlug,
    );
    setOrders(mine);
    let cancelled = false;
    Promise.all(
      mine.map(async (order) => {
        const summary = await getOrderStatusSummary(order.orderId);
        return [order.orderId, summary?.status] as const;
      }),
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<string, OrderStatus> = {};
      for (const [orderId, status] of entries) {
        if (status) next[orderId] = status;
      }
      setStatuses(next);
    });
    return () => {
      cancelled = true;
    };
  }, [eventSlug]);

  if (orders.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-ink">
        Pesanan kamu di event ini
      </h2>
      <Card pad="none">
        <ul className="divide-y divide-line">
          {orders.map((order) => (
            <li key={order.orderId}>
              <Link
                href={`/pesanan/${order.orderId}`}
                className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-bg"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate font-semibold text-ink">
                    {order.stallName}
                  </p>
                  {statuses[order.orderId] ? (
                    <OrderStatusBadge status={statuses[order.orderId]} />
                  ) : null}
                </div>
                <span className="shrink-0 font-bold tracking-wide tabular-nums text-ink">
                  {order.orderCode}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <p className="text-xs text-ink-muted">
        Tunjukkan Kode Pesanan di tiap Gerai saat mengambil barang.
      </p>
    </section>
  );
}
