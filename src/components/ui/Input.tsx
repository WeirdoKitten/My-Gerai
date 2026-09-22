import type { InputHTMLAttributes, ReactNode } from "react";
import { XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

const BASE =
  "w-full rounded-control border bg-surface px-3.5 text-ink placeholder:text-ink-muted focus:border-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand disabled:opacity-60";

export function Input({
  inputSize = "md",
  invalid = false,
  className,
  leftIcon,
  onClear,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  inputSize?: "md" | "sm";
  invalid?: boolean;
  /** Ikon di sisi kiri (mis. kaca pembesar untuk kotak cari). */
  leftIcon?: ReactNode;
  /** Tombol hapus (×) di sisi kanan, muncul saat `value` terisi. */
  onClear?: () => void;
}) {
  const showClear = Boolean(onClear && props.value);
  const input = (
    <input
      className={cn(
        BASE,
        inputSize === "sm" ? "h-9 text-sm" : "h-11 text-[15px]",
        invalid ? "border-danger" : "border-line",
        leftIcon ? "pl-10" : undefined,
        showClear ? "pr-10" : undefined,
        className,
      )}
      {...props}
    />
  );

  if (!leftIcon && !onClear) return input;

  return (
    <div className="relative">
      {leftIcon ? (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">
          {leftIcon}
        </span>
      ) : null}
      {input}
      {showClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Hapus"
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-ink-muted hover:text-ink"
        >
          <XIcon className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
