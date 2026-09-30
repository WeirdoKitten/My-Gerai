import type { SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

const BASE =
  "w-full cursor-pointer appearance-none rounded-control border bg-surface pr-10 pl-3.5 text-ink focus:border-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Dropdown pilihan (`<select>` bawaan browser) dengan gaya sama seperti
 * `Input`. Sengaja native: di HP otomatis tampil sebagai roda/lembar
 * pilihan sistem yang nyaman dipakai satu tangan, tanpa library tambahan.
 */
export function Select({
  selectSize = "md",
  invalid = false,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  selectSize?: "md" | "sm";
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <select
        className={cn(
          BASE,
          selectSize === "sm" ? "h-9 text-sm" : "h-11 text-[15px]",
          invalid ? "border-danger" : "border-line",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
    </div>
  );
}
