import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Pill pilihan single-select (mis. opsi varian Item) — dipakai berjajar dalam satu grup. */
export function PillOption({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
        selected
          ? "border-brand-strong bg-brand-tint text-brand-strong"
          : "border-line bg-surface text-ink hover:border-ink-muted/40",
      )}
    >
      {children}
    </button>
  );
}
