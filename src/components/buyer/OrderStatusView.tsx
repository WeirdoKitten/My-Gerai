"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { formatRupiah } from "@/lib/utils/money";
import { FINAL_ORDER_STATUSES } from "@/lib/utils/order-status";
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
      <Card pad="lg" className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-ink-muted">Kode Pesanan</p>
        <p className="text-3xl font-extrabold tracking-[0.15em] tabular-nums text-ink">
          {order.orderCode}
        </p>
        <OrderStatusBadge status={order.status} />
      </Card>

      {order.qrImageUrl ? (
        <Card pad="lg" className="flex flex-col items-center gap-3">
          <p className="text-sm text-ink-muted">
            {order.canSimulate
              ? "Pindai untuk bayar (simulasi)"
              : "Pindai dengan aplikasi apa pun yang mendukung QRIS"}
          </p>
          {/* biome-ignore lint/performance/noImgElement: data URI, next/image tidak berlaku */}
          <img
            src={order.qrImageUrl}
            alt="QR pembayaran"
            className="size-48 rounded-control"
          />
          {order.canSimulate ? (
            <>
              <Button
                type="button"
                fullWidth
                loading={simulating}
                onClick={handleSimulate}
              >
                {simulating
                  ? "Memproses..."
                  : "Simulasikan Pembayaran Berhasil"}
              </Button>
              {simulateError ? (
                <Alert tone="error">{simulateError}</Alert>
              ) : null}
            </>
          ) : (
            <p className="text-center text-xs text-ink-muted">
              Halaman ini otomatis diperbarui setelah pembayaran diterima.
            </p>
          )}
        </Card>
      ) : null}

      {order.sandboxQrUrl ? (
        <Card className="flex items-center gap-2">
          <code className="block flex-1 overflow-x-auto rounded-control bg-bg p-2 text-xs text-ink">
            {order.sandboxQrUrl}
          </code>
          <CopyButton value={order.sandboxQrUrl} label="link QRIS sandbox" />
        </Card>
      ) : null}

      <Card className="flex flex-col gap-3">
        <div>
          <p className="font-semibold text-ink">{order.stallName}</p>
          <p className="text-sm text-ink-muted">Atas nama {order.buyerName}</p>
        </div>
        <ul className="flex flex-col gap-1.5 border-t border-line pt-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-2 text-sm">
              <span className="text-ink">
                {item.qty}× {item.productNameSnapshot}
              </span>
              <span className="tabular-nums text-ink-muted">
                {formatRupiah(item.priceSnapshot * item.qty)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-1 border-t border-line pt-3">
          <div className="flex justify-between text-sm text-ink-muted">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatRupiah(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-ink-muted">
            <span>Biaya Layanan</span>
            <span className="tabular-nums">
              {formatRupiah(order.platformFeeSnapshot)}
            </span>
          </div>
          <div className="mt-1 flex justify-between border-t border-line pt-2 font-bold text-ink">
            <span>Total Dibayar</span>
            <span className="tabular-nums">
              {formatRupiah(order.grandTotal)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
