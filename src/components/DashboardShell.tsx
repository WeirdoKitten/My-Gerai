import type { ReactNode } from "react";
import { DashboardNav, type NavItem } from "@/components/DashboardNav";
import { Wordmark } from "@/components/ui/Wordmark";
import { cn } from "@/lib/utils/cn";

export function DashboardShell({
  heading,
  nav,
  logoutAction,
  width = "max-w-2xl",
  children,
}: {
  heading: string;
  nav: NavItem[];
  logoutAction: () => Promise<void>;
  width?: "max-w-2xl" | "max-w-3xl";
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur">
        <div
          className={cn(
            "mx-auto flex w-full items-center justify-between gap-3 px-4 pt-3",
            width,
          )}
        >
          <div className="flex min-w-0 flex-col">
            <Wordmark className="text-sm" />
            <span className="truncate text-xs text-ink-muted">{heading}</span>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="shrink-0 text-sm font-semibold text-ink-muted transition-colors hover:text-brand-strong"
            >
              Keluar
            </button>
          </form>
        </div>
        <div className={cn("mx-auto w-full overflow-x-auto px-2", width)}>
          <DashboardNav items={nav} />
        </div>
      </header>
      <main className={cn("mx-auto w-full flex-1 px-4 py-6", width)}>
        {children}
      </main>
    </div>
  );
}
