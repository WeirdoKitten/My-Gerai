"use client";

import { useEffect, useRef, useState } from "react";
import { formatRupiah } from "@/lib/utils/money";
import {
  FINAL_ORDER_STATUSES,
  ORDER_STATUS_LABEL_ID,
} from "@/lib/utils/order-status";
import { getOrderStatus, simulatePaymentSuccess } from "@/server/orders";
import type { BuyerOrderStatusView } from "@/types/order";

const POLL_INTERVAL_MS = 4000;

export function OrderStatusView({
  initialOrder,
}: {
  initialOrder: BuyerOrderStatusView;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [simulating, setSimulating] = useState(false);
  const [simulateError, setSimulateError] = useState<string | null>(null);
  const orderIdRef = useRef(initialOrder.id);

  useEffect(() => {
    if (FINAL_ORDER_STATUSES.includes(order.status)) return;

    const interval = window.setInterval(async () => {
      const latest = await getOrderStatus(orderIdRef.current);
      if (latest) setOrder(latest);
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [order.status]);

  async function handleSimulate() {
    setSimulating(true);
    setSimulateError(null);
    const result = await simulatePaymentSuccess(order.id);
    if (!result.ok) {
      setSimulateError(result.message ?? "Simulasi pembayaran gagal.");
    }
    const latest = await getOrderStatus(order.id);
    if (latest) setOrder(latest);
    setSimulating(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-zinc-200 p-4 text-center dark:border-zinc-800">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Kode Pesanan</p>
        <p className="text-3xl font-bold tracking-widest text-zinc-900 dark:text-zinc-50">
          {order.orderCode}
        </p>
        <p className="mt-2 inline-block rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {ORDER_STATUS_LABEL_ID[order.status]}
        </p>
      </div>

      {order.qrImageUrl ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Pindai untuk bayar (simulasi)
          </p>
          {/* biome-ignore lint/performance/noImgElement: data URI, next/image tidak berlaku untuk ini */}
          <img
            src={order.qrImageUrl}
            alt="QR pembayaran"
            className="h-48 w-48"
          />
          <button
            type="button"
            onClick={handleSimulate}
            disabled={simulating}
            className="h-11 w-full rounded-md bg-zinc-900 font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {simulating ? "Memproses..." : "Simulasikan Pembayaran Berhasil"}
          </button>
          {simulateError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {simulateError}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="font-medium text-zinc-900 dark:text-zinc-50">
          {order.stallName}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Atas nama: {order.buyerName}
        </p>
        <div className="mt-2 flex flex-col gap-1">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.qty}x {item.productNameSnapshot}
              </span>
              <span>{formatRupiah(item.priceSnapshot * item.qty)}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
          <span>Total Dibayar</span>
          <span>{formatRupiah(order.subtotal)}</span>
        </div>
      </div>
    </div>
  );
}
