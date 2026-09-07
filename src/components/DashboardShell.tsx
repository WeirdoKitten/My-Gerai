import type { ReactNode } from "react";
import { DashboardNav, type NavItem } from "@/components/DashboardNav";
import { Button } from "@/components/ui/Button";
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
  /** Baris kedua opsional (dipakai Admin: "Admin · <nama>"). */
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
        <div className={cn("mx-auto w-full px-4", width)}>
          <div className="flex items-center justify-between gap-3 pt-3">
            <div className="min-w-0">{brand}</div>
            <div className="flex shrink-0 items-center gap-2">
              {headerAction}
              <form action={logoutAction}>
                <Button type="submit" variant="dangerOutline" size="sm">
                  Keluar
                </Button>
              </form>
            </div>
          </div>
          {heading ? (
            <p className="mt-1.5 truncate text-base font-bold tracking-tight text-ink">
              {heading}
            </p>
          ) : null}
          <div
            className={cn(
              heading ? "mt-3" : "mt-2",
              "overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            )}
          >
            <DashboardNav items={nav} />
          </div>
        </div>
      </header>
      <main className={cn("mx-auto w-full flex-1 px-4 py-6", width)}>
        {children}
      </main>
    </div>
  );
}
