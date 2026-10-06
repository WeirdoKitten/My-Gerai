"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReceiptIcon } from "@/components/ui/icons";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { PillOption } from "@/components/ui/PillOption";
import { Select } from "@/components/ui/Select";
import { formatDateTime, formatSchedule } from "@/lib/utils/datetime";
import { listEventOrders } from "@/server/events";
import type { EventOrderView } from "@/types/event";

const POLL_INTERVAL_MS = 15_000;

type StatusFilter = "all" | "belum_diambil" | "selesai";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "belum_diambil", label: "Belum diambil" },
  { value: "selesai", label: "Selesai" },
];

/**
 * Daftar Pesanan event (read-only) — dipoll tiap 15 dtk supaya EO bisa
 * memantau Pesanan peserta yang masuk & yang belum diambil.
 */
export function EventOrderList({
  eventId,
  initialOrders,
}: {
  eventId: string;
  initialOrders: EventOrderView[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [stallFilter, setStallFilter] = useState<string>("all");

  useEffect(() => {
    const interval = window.setInterval(async () => {
      const latest = await listEventOrders(eventId);
      if (latest) setOrders(latest);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [eventId]);

  const stallNames = [...new Set(orders.map((order) => order.stallName))];
  const shown = orders.filter((order) => {
    if (stallFilter !== "all" && order.stallName !== stallFilter) return false;
    if (filter === "selesai") return order.status === "selesai";
    if (filter === "belum_diambil") {
      return order.status !== "selesai" && order.status !== "dibatalkan";
    }
    return true;
  });

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptIcon className="size-10" />}
        title="Belum ada Pesanan"
        description="Pesanan peserta yang sudah dibayar lewat QR event akan muncul di sini."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <PillOption
            key={option.value}
            selected={filter === option.value}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </PillOption>
        ))}
      </div>
      {stallNames.length > 1 ? (
        <Select
          selectSize="sm"
          value={stallFilter}
          onChange={(e) => setStallFilter(e.target.value)}
          aria-label="Filter Gerai"
        >
          <option value="all">Semua Gerai</option>
          {stallNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      ) : null}
      <p className="text-sm text-ink-muted">{shown.length} Pesanan</p>
      <ul className="flex flex-col gap-3">
        {shown.map((order) => (
          <li key={order.id}>
            <Card className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold tracking-wide tabular-nums text-ink">
                  {order.orderCode}
                </p>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="text-sm text-ink">
                <span className="font-semibold">{order.buyerName}</span> ·{" "}
                {order.stallName}
              </p>
              <ul className="text-sm text-ink-muted">
                {order.items.map((item, index) => (
                  <li key={`${order.id}-${index}`}>
                    {item.qty}× {item.name}
                    {item.variants.length > 0
                      ? ` (${item.variants.join(", ")})`
                      : ""}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink-muted">
                {formatDateTime(new Date(order.createdAt))}
                {order.scheduledFor
                  ? ` · Pre-order ${formatSchedule(new Date(order.scheduledFor))}`
                  : ""}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
