"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export type NavItem = { href: Route; label: string };

export function DashboardNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1">
      {items.map((item) => {
        // Tab "index" (punya tab anak, mis. /dashboard) hanya aktif saat cocok
        // persis — supaya tidak ikut aktif di /dashboard/profil dsb.
        const isIndex = items.some(
          (other) => other !== item && other.href.startsWith(`${item.href}/`),
        );
        const active = isIndex
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
              active
                ? "border-brand text-brand-strong"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
