import { MinusIcon, PlusIcon } from "./icons";

export function QuantityStepper({
  value,
  onDecrement,
  onIncrement,
  min = 1,
  max = 99,
  label = "jumlah",
}: {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-surface">
      <button
        type="button"
        onClick={onDecrement}
        disabled={value <= min}
        aria-label={`Kurangi ${label}`}
        className="flex size-9 items-center justify-center text-ink transition-colors hover:text-brand-strong disabled:opacity-40 disabled:hover:text-ink"
      >
        <MinusIcon className="size-4" />
      </button>
      <span className="w-7 text-center text-[15px] font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={value >= max}
        aria-label={`Tambah ${label}`}
        className="flex size-9 items-center justify-center text-ink transition-colors hover:text-brand-strong disabled:opacity-40 disabled:hover:text-ink"
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}
