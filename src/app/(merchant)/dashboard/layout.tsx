import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { NavItem } from "@/components/DashboardNav";
import { DashboardShell } from "@/components/DashboardShell";
import { UserIcon } from "@/components/ui/icons";
import { Wordmark } from "@/components/ui/Wordmark";
import { getMerchantSession } from "@/lib/auth/session";
import { logoutMerchant } from "@/server/merchants";

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Pesanan", icon: "receipt" },
  { href: "/dashboard/produk", label: "Item", icon: "tag" },
  { href: "/dashboard/qr", label: "QR Lapak", icon: "qr" },
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
