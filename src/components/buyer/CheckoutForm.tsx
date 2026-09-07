"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
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

    cart.clearCart();
    router.push(`/pesanan/${result.orderId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field
        label="Nama"
        hint="Ditunjukkan ke Pedagang saat kamu ambil pesanan."
      >
        <Input
          type="text"
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          placeholder="Nama kamu"
          required
          maxLength={100}
        />
      </Field>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Button type="submit" fullWidth loading={submitting}>
        {submitting ? "Membuat Pesanan..." : "Buat Pesanan"}
      </Button>
    </form>
  );
}
