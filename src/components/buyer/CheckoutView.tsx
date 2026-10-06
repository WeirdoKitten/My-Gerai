"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart/cart-context";
import type { FulfillmentMethod } from "@/lib/utils/order-status";
import { getStallDeliverySettings } from "@/server/products";
import type { StallDeliveryView } from "@/types/product";
import { CartSummary } from "./CartSummary";
import { CheckoutForm } from "./CheckoutForm";

/**
 * Pembungkus checkout: memuat pengaturan antar Lapak aktif (Fase 11) dan
 * menyimpan pilihan mode Pesanan, supaya rincian total (CartSummary) dan
 * form (CheckoutForm) memakai Ongkir yang sama.
 */
export function CheckoutView({
  platformFeeAmount,
}: {
  platformFeeAmount: number;
}) {
  const { stallSlug, eventSlug } = useCart();
  const [delivery, setDelivery] = useState<StallDeliveryView>(null);
  const [method, setMethod] = useState<FulfillmentMethod>("ambil_sendiri");

  useEffect(() => {
    setDelivery(null);
    setMethod("ambil_sendiri");
    // Pesanan event selalu diambil sendiri di Gerai — pilihan Diantar tidak
    // ditawarkan (createOrder juga menolaknya).
    if (!stallSlug || eventSlug) return;
    let cancelled = false;
    getStallDeliverySettings(stallSlug).then((result) => {
      if (!cancelled) setDelivery(result);
    });
    return () => {
      cancelled = true;
    };
  }, [stallSlug, eventSlug]);

  const deliveryFee = method === "antar" && delivery ? delivery.fee : 0;

  return (
    <>
      <CartSummary
        platformFeeAmount={platformFeeAmount}
        deliveryFee={deliveryFee}
      />
      <CheckoutForm
        platformFeeAmount={platformFeeAmount}
        delivery={delivery}
        method={delivery ? method : "ambil_sendiri"}
        onMethodChange={setMethod}
      />
    </>
  );
}
