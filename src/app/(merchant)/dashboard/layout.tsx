import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { UserIcon } from "@/components/ui/icons";
import { Wordmark } from "@/components/ui/Wordmark";
import { getMerchantSession } from "@/lib/auth/session";
import { logoutMerchant } from "@/server/merchants";

const NAV: { href: Route; label: string }[] = [
  { href: "/dashboard", label: "Pesanan" },
  { href: "/dashboard/produk", label: "Item" },
  { href: "/dashboard/qr", label: "QR Lapak" },
];

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getMerchantSession();
  if (!session) redirect("/login");

  return (
    <DashboardShell
      brand={<Wordmark label={session.stallName} className="text-sm" />}
      nav={NAV}
      logoutAction={logoutMerchant}
      headerAction={
        <Link
          href="/dashboard/profil"
          aria-label="Profil Lapak"
          className="flex size-9 items-center justify-center rounded-control border border-line text-ink-muted transition-colors hover:bg-bg hover:text-ink"
        >
          <UserIcon className="size-4" />
        </Link>
      }
    >
      {children}
    </DashboardShell>
  );
}
