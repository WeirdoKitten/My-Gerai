"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { loadBuyerProfile, saveBuyerProfile } from "@/lib/buyer/storage";
import { useCart } from "@/lib/cart/cart-context";
import {
  type Coordinates,
  formatDistanceKm,
  haversineDistanceKm,
} from "@/lib/utils/geo";
import { formatRupiah } from "@/lib/utils/money";
import type { FulfillmentMethod } from "@/lib/utils/order-status";
import { createOrder } from "@/server/orders";
import type { StallDeliveryView } from "@/types/product";
import { FulfillmentMethodPicker } from "./FulfillmentMethodPicker";

// Leaflet cuma dimuat kalau Pembeli memilih "Diantar" — halaman checkout mode
// Ambil sendiri tetap ringan (prioritas performa halaman Pembeli).
const LocationMapPicker = dynamic(
  () =>
    import("@/components/merchant/LocationMapPicker").then(
      (mod) => mod.LocationMapPicker,
    ),
  { ssr: false },
);

export function CheckoutForm({
  platformFeeAmount,
  delivery,
  method,
  onMethodChange,
}: {
  platformFeeAmount: number;
  /** `null` = Lapak tidak menerima antar, pilihan mode disembunyikan. */
  delivery: StallDeliveryView;
  method: FulfillmentMethod;
  onMethodChange: (method: FulfillmentMethod) => void;
}) {
  const router = useRouter();
  const cart = useCart();
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLandmark, setDeliveryLandmark] = useState("");
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Isi otomatis dari pesanan sebelumnya (localStorage, setelah mount supaya
  // tidak memicu hydration mismatch).
  useEffect(() => {
    const profile = loadBuyerProfile();
    if (!profile) return;
    setBuyerName(profile.buyerName);
    setBuyerPhone(profile.buyerPhone);
    setDeliveryAddress(profile.deliveryAddress);
    setDeliveryLandmark(profile.deliveryLandmark);
    if (
      profile.deliveryLatitude !== null &&
      profile.deliveryLongitude !== null
    ) {
      setLocation({
        latitude: profile.deliveryLatitude,
        longitude: profile.deliveryLongitude,
      });
    }
  }, []);

  const isDelivery = method === "antar" && delivery !== null;
  const stallLocation: Coordinates | null = delivery
    ? { latitude: delivery.stallLatitude, longitude: delivery.stallLongitude }
    : null;
  // Peringatan dini di browser saja — server tetap menghitung ulang jarak.
  const distanceKm =
    isDelivery && location && stallLocation
      ? haversineDistanceKm(stallLocation, location)
      : null;
  const outOfRange =
    distanceKm !== null && delivery !== null && distanceKm > delivery.radiusKm;

  const amountToPay =
    (cart.paymentMode === "qris_pribadi"
      ? cart.subtotalDisplay
      : cart.subtotalDisplay + platformFeeAmount) +
    (isDelivery && delivery ? delivery.fee : 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cart.stallSlug || cart.items.length === 0) return;
    if (isDelivery && !location) {
      setError("Pasang titik lokasi pengantaran di peta.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const base = {
      merchantSlug: cart.stallSlug,
      buyerName,
      items: cart.items.map((item) => ({
        productId: item.productId,
        qty: item.qty,
        note: item.note || undefined,
        // Buang field display-only (groupName/optionName/priceDelta) — server
        // selalu re-derive harga sendiri dari groupId+optionId, tidak pernah
        // mempercayai apa pun dari klien.
        variantSelections: item.variantSelections.map((s) => ({
          groupId: s.groupId,
          optionId: s.optionId,
        })),
      })),
    };

    const result =
      isDelivery && location
        ? await createOrder({
            ...base,
            fulfillmentMethod: "antar",
            buyerPhone,
            deliveryAddress,
            deliveryLandmark: deliveryLandmark || undefined,
            deliveryLatitude: location.latitude,
            deliveryLongitude: location.longitude,
          })
        : await createOrder({ ...base, fulfillmentMethod: "ambil_sendiri" });

    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
      return;
    }

    saveBuyerProfile(
      isDelivery && location
        ? {
            buyerName,
            buyerPhone,
            deliveryAddress,
            deliveryLandmark,
            deliveryLatitude: location.latitude,
            deliveryLongitude: location.longitude,
          }
        : { buyerName },
    );
    cart.clearCart();
    router.push(`/pesanan/${result.orderId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {delivery ? (
        <FulfillmentMethodPicker
          value={method}
          onChange={onMethodChange}
          delivery={delivery}
        />
      ) : null}
      <Field
        label="Nama"
        hint={
          isDelivery
            ? "Dipakai Pedagang saat mengantar pesanan."
            : "Ditunjukkan ke Pedagang saat kamu ambil pesanan."
        }
      >
        <Input
          type="text"
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          placeholder="Nama kamu"
          required
          maxLength={100}
          autoComplete="name"
        />
      </Field>
      {isDelivery && delivery ? (
        <>
          <Field
            label="Nomor HP/WhatsApp"
            hint="Pedagang menghubungimu lewat nomor ini saat mengantar."
          >
            <Input
              type="tel"
              inputMode="tel"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              placeholder="0812 3456 7890"
              required
              maxLength={20}
              autoComplete="tel"
            />
          </Field>
          <Field label="Alamat pengantaran">
            <Textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Nama jalan, nomor rumah, RT/RW"
              required
              maxLength={300}
              rows={2}
              autoComplete="street-address"
            />
          </Field>
          <Field label="Patokan (opsional)">
            <Input
              type="text"
              value={deliveryLandmark}
              onChange={(e) => setDeliveryLandmark(e.target.value)}
              placeholder="Contoh: pagar hijau, sebelah masjid"
              maxLength={150}
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">
              Titik lokasi pengantaran
            </span>
            <LocationMapPicker
              value={location}
              onChange={setLocation}
              initialCenter={stallLocation ?? undefined}
            />
            {distanceKm !== null ? (
              <span
                className={
                  outOfRange
                    ? "text-xs font-medium text-danger"
                    : "text-xs text-ink-muted"
                }
              >
                {outOfRange
                  ? `Di luar jangkauan antar (${formatDistanceKm(distanceKm)} dari Lapak, maks. ${formatDistanceKm(delivery.radiusKm)}).`
                  : `${formatDistanceKm(distanceKm)} dari Lapak.`}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-ink-muted">
            Alamat & nomor HP hanya dipakai untuk pengantaran pesanan ini dan
            hanya bisa dilihat Pedagang Lapak ini.
          </p>
        </>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Button
        type="submit"
        fullWidth
        loading={submitting}
        disabled={outOfRange}
      >
        {submitting
          ? "Membuat Pesanan..."
          : `Buat Pesanan · Bayar ${formatRupiah(amountToPay)}`}
      </Button>
    </form>
  );
}
