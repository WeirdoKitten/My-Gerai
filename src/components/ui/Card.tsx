import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Pad = "none" | "sm" | "md" | "lg";

const PAD: Record<Pad, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export function Card({
  as: Tag = "div",
  pad = "md",
  elevated = false,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  pad?: Pad;
  elevated?: boolean;
  children: ReactNode;
}) {
  return (
    <Tag
      className={cn(
        "rounded-card border border-line bg-surface",
        PAD[pad],
        elevated && "shadow-card",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
