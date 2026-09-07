import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { type ButtonSize, type ButtonVariant, buttonClasses } from "./Button";

export function ButtonLink({
  href,
  variant,
  size,
  fullWidth,
  className,
  children,
}: {
  href: Route;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={buttonClasses({ variant, size, fullWidth, className })}
    >
      {children}
    </Link>
  );
}
