import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-xl font-bold tracking-tight text-ink">{title}</h1>
      {subtitle ? <p className="text-sm text-ink-muted">{subtitle}</p> : null}
    </div>
  );
}
