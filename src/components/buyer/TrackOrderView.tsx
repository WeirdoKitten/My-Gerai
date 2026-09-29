"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { loadRecentOrders, type RecentOrder } from "@/lib/buyer/storage";
import { formatDateTime } from "@/lib/utils/datetime";
import { findOrderForTracking } from "@/server/orders";

/**
 * "Pesanan Saya" (dari localStorage perangkat ini) + form Kode Pesanan untuk
 * Pembeli yang kehilangan link — tetap tanpa login (Fase 11).
 */
export function TrackOrderView() {
  const router = useRouter();
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [orderCode, setOrderCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setRecentOrders(loadRecentOrders());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await findOrderForTracking(orderCode);
    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
      return;
    }
    router.push(`/pesanan/${result.orderId}`);
  }

  return (
    <div className="flex flex-col gap-5">
      {recentOrders.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-ink">
            Pesanan di perangkat ini
          </h2>
          <Card pad="none">
            <ul className="divide-y divide-line">
              {recentOrders.map((order) => (
                <li key={order.orderId}>
                  <Link
                    href={`/pesanan/${order.orderId}`}
                    className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-bg"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">
                        {order.stallName}
                      </p>
                      <p className="text-sm text-ink-muted">
                        {formatDateTime(new Date(order.createdAt))}
                      </p>
                    </div>
                    <span className="shrink-0 font-bold tracking-wide tabular-nums text-ink">
                      {order.orderCode}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-ink">
          Cari dengan Kode Pesanan
        </h2>
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field
              label="Kode Pesanan"
              hint="8 karakter, ada di halaman status pesananmu."
            >
              <Input
                type="text"
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
                placeholder="K7QX9MB4"
                required
                maxLength={20}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                className="font-semibold tracking-[0.15em]"
              />
            </Field>
            {error ? <Alert tone="error">{error}</Alert> : null}
            <Button type="submit" fullWidth loading={submitting}>
              {submitting ? "Mencari..." : "Lacak Pesanan"}
            </Button>
          </form>
        </Card>
        <p className="text-xs text-ink-muted">
          Kode Pesanan ada di halaman status pesananmu. Pesanan lama dengan kode
          4 karakter tidak bisa dilacak di sini, tanyakan langsung ke Pedagang.
        </p>
      </section>
    </div>
  );
}
