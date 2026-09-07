import type { ReactNode } from "react";
import { DashboardNav, type NavItem } from "@/components/DashboardNav";
import { Button } from "@/components/ui/Button";
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
        <div className={cn("mx-auto w-full px-4", width)}>
          <div className="flex items-center justify-between gap-3 pt-3">
            <Wordmark className="text-sm" />
            <form action={logoutAction}>
              <Button type="submit" variant="danger" size="sm">
                Keluar
              </Button>
            </form>
          </div>
          <p className="mt-1.5 truncate text-base font-bold tracking-tight text-ink">
            {heading}
          </p>
          <div className="mt-3 overflow-x-auto">
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
