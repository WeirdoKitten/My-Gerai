import type { Route } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { ButtonLink } from "@/components/ui/ButtonLink";
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
      nav={NAV}
      logoutAction={logoutMerchant}
      headerAction={
        <ButtonLink href="/dashboard/profil" variant="secondary" size="sm">
          Profil
        </ButtonLink>
      }
    >
      {children}
    </DashboardShell>
  );
}
