import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Wordmark } from "@/components/ui/Wordmark";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Wordmark className="text-lg" />
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight text-ink">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-sm text-ink-muted">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <Card pad="lg" elevated>
          {children}
        </Card>
      </div>
    </main>
  );
}
