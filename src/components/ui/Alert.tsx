import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "error" | "success" | "info" | "warning";

const TONES: Record<Tone, string> = {
  error: "bg-danger-bg text-danger",
  success: "bg-success-bg text-success",
  info: "bg-info-bg text-info",
  warning: "bg-warning-bg text-warning",
};

export function Alert({
  tone = "info",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "rounded-control px-3.5 py-3 text-sm",
        TONES[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
