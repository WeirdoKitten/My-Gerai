import type { Route } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { getMerchantSession } from "@/lib/auth/session";
import { logoutMerchant } from "@/server/merchants";

const NAV: { href: Route; label: string }[] = [
  { href: "/dashboard", label: "Pesanan" },
  { href: "/dashboard/produk", label: "Item" },
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
      heading={session.stallName}
      nav={NAV}
      logoutAction={logoutMerchant}
    >
      {children}
    </DashboardShell>
  );
}
