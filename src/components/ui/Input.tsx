import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const BASE =
  "w-full rounded-control border bg-surface px-3.5 text-ink placeholder:text-ink-muted focus:border-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand disabled:opacity-60";

export function Input({
  inputSize = "md",
  invalid = false,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  inputSize?: "md" | "sm";
  invalid?: boolean;
}) {
  return (
    <input
      className={cn(
        BASE,
        inputSize === "sm" ? "h-9 text-sm" : "h-11 text-[15px]",
        invalid ? "border-danger" : "border-line",
        className,
      )}
      {...props}
    />
  );
}
