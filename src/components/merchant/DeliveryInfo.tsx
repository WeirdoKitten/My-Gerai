import { MapPinIcon } from "@/components/ui/icons";
import { formatDistanceKm } from "@/lib/utils/geo";
import { formatRupiah } from "@/lib/utils/money";
import {
  DELIVERY_FAILURE_REASON_LABEL_ID,
  ORDER_STATUS_LABEL_ID,
} from "@/lib/utils/order-status";
import { formatIndonesianPhone } from "@/lib/utils/phone";
import type { MerchantOrderDeliveryView } from "@/types/order";

const LINK_CLASS =
  "inline-flex h-9 items-center justify-center rounded-control border border-line bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:bg-bg";

/**
 * Blok info Pesanan Antar di kartu Pesanan Pedagang — alamat, HP, jarak,
 * Ongkir, plus link Maps & WhatsApp (`wa.me`, tanpa API berbayar).
 */
export function DeliveryInfo({
  delivery,
  deliveryFee,
  showActions = true,
}: {
  delivery: MerchantOrderDeliveryView;
  deliveryFee: number;
  showActions?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-control border border-line bg-bg p-3 text-sm">
      <div className="flex items-start gap-2">
        <MapPinIcon className="mt-0.5 size-4 shrink-0 text-brand-strong" />
        <div className="flex flex-col gap-0.5">
          <p className="text-ink">{delivery.address}</p>
          {delivery.landmark ? (
            <p className="text-ink-muted">Patokan: {delivery.landmark}</p>
          ) : null}
          <p className="text-ink-muted">
            {formatIndonesianPhone(delivery.buyerPhone)}
            {delivery.distanceKm !== null
              ? ` · ${formatDistanceKm(delivery.distanceKm)}`
              : ""}
            {` · Ongkir ${formatRupiah(deliveryFee)}`}
          </p>
          {delivery.failureReason ? (
            <p className="text-danger">
              {ORDER_STATUS_LABEL_ID.gagal_diantar}:{" "}
              {DELIVERY_FAILURE_REASON_LABEL_ID[delivery.failureReason]}
              {delivery.failureNote ? ` — ${delivery.failureNote}` : ""}
            </p>
          ) : null}
        </div>
      </div>
      {showActions ? (
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${delivery.latitude},${delivery.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            Buka di Maps
          </a>
          <a
            href={`https://wa.me/${delivery.buyerPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            Chat WA
          </a>
        </div>
      ) : null}
    </div>
  );
}
