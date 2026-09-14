import type { ReactNode } from "react";
import { DashboardNav, type NavItem } from "@/components/DashboardNav";
import { LogoutButton } from "@/components/LogoutButton";
import { cn } from "@/lib/utils/cn";

export function DashboardShell({
  brand,
  heading,
  headerAction,
  nav,
  logoutAction,
  width = "max-w-2xl",
  children,
}: {
  /** Kiri-atas header (mis. `<Wordmark>` atau nama Lapak). */
  brand: ReactNode;
  /** Baris kecil di bawah brand (dipakai Admin: "Admin · <nama>"). */
  heading?: string;
  headerAction?: ReactNode;
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
            "mx-auto flex w-full items-center justify-between gap-3 px-4 py-3",
            width,
          )}
        >
          <div className="flex min-w-0 flex-col">
            {brand}
            {heading ? (
              <span className="truncate text-xs text-ink-muted">{heading}</span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerAction}
            <LogoutButton action={logoutAction} />
          </div>
        </div>
      </header>

      <main className={cn("mx-auto w-full flex-1 px-4 pb-24 pt-6", width)}>
        {children}
      </main>

      <DashboardNav items={nav} />
    </div>
  );
}
