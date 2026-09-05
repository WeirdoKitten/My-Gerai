"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart/cart-context";
import { createOrder } from "@/server/orders";

export function CheckoutForm() {
  const router = useRouter();
  const cart = useCart();
  const [buyerName, setBuyerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cart.stallSlug || cart.items.length === 0) return;

    setSubmitting(true);
    setError(null);

    const result = await createOrder({
      merchantSlug: cart.stallSlug,
      buyerName,
      items: cart.items.map((item) => ({
        productId: item.productId,
        qty: item.qty,
        note: item.note || undefined,
      })),
    });

    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
      return;
    }

    // Kosongkan cart dulu (efek klien) sebelum navigasi, supaya pasti sempat jalan.
    cart.clearCart();
    router.push(`/pesanan/${result.orderId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Nama
        </span>
        <input
          type="text"
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          placeholder="Nama kamu"
          required
          maxLength={100}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="h-11 rounded-md bg-zinc-900 font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {submitting ? "Membuat Pesanan..." : "Buat Pesanan"}
      </button>
    </form>
  );
}
