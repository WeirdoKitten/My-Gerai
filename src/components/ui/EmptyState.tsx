import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      {icon ? <div className="mb-1 text-ink-muted">{icon}</div> : null}
      <p className="font-semibold text-ink">{title}</p>
      {description ? (
        <p className="max-w-xs text-sm text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
