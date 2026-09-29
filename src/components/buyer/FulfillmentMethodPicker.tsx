import type { ReactNode } from "react";
import { CheckIcon, DeliveryIcon, StoreIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";
import { formatDistanceKm } from "@/lib/utils/geo";
import { formatRupiah } from "@/lib/utils/money";
import type { FulfillmentMethod } from "@/lib/utils/order-status";
import type { StallDeliveryView } from "@/types/product";

/**
 * Pilihan cara terima Pesanan (Fase 11) — dua kartu besar berdampingan,
 * mudah disentuh jempol, dengan ikon, keterangan singkat, dan biaya. Tiap
 * kartu adalah `<label>` berisi radio asli yang disembunyikan — dapat
 * semantik & navigasi panah keyboard bawaan browser.
 */
export function FulfillmentMethodPicker({
  value,
  onChange,
  delivery,
}: {
  value: FulfillmentMethod;
  onChange: (method: FulfillmentMethod) => void;
  delivery: NonNullable<StallDeliveryView>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <fieldset className="grid grid-cols-2 gap-2.5">
        <legend className="mb-1.5 text-sm font-semibold text-ink">
          Cara terima pesanan
        </legend>
        <MethodCard
          selected={value === "ambil_sendiri"}
          onSelect={() => onChange("ambil_sendiri")}
          icon={<StoreIcon className="size-5" />}
          title="Ambil Sendiri"
          description="Datang ke Lapak"
          price="Gratis"
        />
        <MethodCard
          selected={value === "antar"}
          onSelect={() => onChange("antar")}
          icon={<DeliveryIcon className="size-5" />}
          title="Diantar"
          description={`Maks. ${formatDistanceKm(delivery.radiusKm)}`}
          price={`+${formatRupiah(delivery.fee)}`}
        />
      </fieldset>
      {value === "antar" && delivery.estimate ? (
        <span className="text-xs text-ink-muted">
          Diantar Pedagang sendiri · estimasi {delivery.estimate} setelah
          diproses.
        </span>
      ) : null}
    </div>
  );
}

function MethodCard({
  selected,
  onSelect,
  icon,
  title,
  description,
  price,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  description: string;
  price: string;
}) {
  return (
    <label
      className={cn(
        "relative flex min-h-28 cursor-pointer flex-col items-start gap-2 rounded-card border-2 p-3.5 text-left transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
        selected
          ? "border-brand-strong bg-brand-tint"
          : "border-line bg-surface hover:border-ink-muted/40",
      )}
    >
      <input
        type="radio"
        name="fulfillment-method"
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-full transition-colors",
          selected ? "bg-brand-strong text-white" : "bg-bg text-ink-muted",
        )}
      >
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="font-bold text-ink">{title}</span>
        <span className="text-xs text-ink-muted">{description}</span>
      </span>
      <span
        className={cn(
          "mt-auto text-sm font-semibold tabular-nums",
          selected ? "text-brand-strong" : "text-ink",
        )}
      >
        {price}
      </span>
      {selected ? (
        <span className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-brand-strong text-white">
          <CheckIcon className="size-3.5" />
        </span>
      ) : null}
    </label>
  );
}
