"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartIcon,
  HistoryIcon,
  QrIcon,
  ReceiptIcon,
  SettingsIcon,
  StoreIcon,
  TagIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

// Nama ikon dipakai sebagai string supaya `NavItem` bisa dilempar dari
// Server Component (layout) ke Client Component ini tanpa error serialisasi.
const ICONS = {
  receipt: ReceiptIcon,
  tag: TagIcon,
  qr: QrIcon,
  store: StoreIcon,
  settings: SettingsIcon,
  wallet: WalletIcon,
  history: HistoryIcon,
  chart: ChartIcon,
} as const;

export type NavItem = {
  href: Route;
  label: string;
  icon: keyof typeof ICONS;
};

/** Navigasi bawah ala aplikasi HP — ikon + label, tetap di bawah layar. */
export function DashboardNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex w-full max-w-md">
        {items.map((item) => {
          // Tab "index" (mis. /dashboard) aktif hanya saat cocok persis.
          const isIndex = items.some(
            (other) => other !== item && other.href.startsWith(`${item.href}/`),
          );
          const active = isIndex
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = ICONS[item.icon];

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition-colors",
                active ? "text-brand-strong" : "text-ink-muted hover:text-ink",
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
