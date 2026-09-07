"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export type NavItem = { href: Route; label: string };

export function DashboardNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  // Item aktif = prefix cocok yang paling panjang (supaya "/dashboard" tidak
  // ikut aktif saat berada di "/dashboard/produk").
  const activeHref = items
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="flex gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
            item.href === activeHref
              ? "border-brand text-brand-strong"
              : "border-transparent text-ink-muted hover:text-ink",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
