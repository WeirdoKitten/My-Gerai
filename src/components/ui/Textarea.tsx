import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Textarea({
  invalid = false,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-control border bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand disabled:opacity-60",
        invalid ? "border-danger" : "border-line",
        className,
      )}
      {...props}
    />
  );
}
