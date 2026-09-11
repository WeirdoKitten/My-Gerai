import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { NavItem } from "@/components/DashboardNav";
import { DashboardShell } from "@/components/DashboardShell";
import { Wordmark } from "@/components/ui/Wordmark";
import { getAdminSession } from "@/lib/auth/admin-session";
import { logoutAdmin } from "@/server/admins";

const NAV: NavItem[] = [
  { href: "/admin/merchants", label: "Pedagang", icon: "store" },
  { href: "/admin/config", label: "Konfigurasi", icon: "settings" },
  { href: "/admin/payouts", label: "Pencairan", icon: "wallet" },
  { href: "/admin/invoices", label: "Tagihan", icon: "receipt" },
];

export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <DashboardShell
      brand={<Wordmark className="text-sm" />}
      heading={`Admin · ${session.name}`}
      nav={NAV}
      logoutAction={logoutAdmin}
      width="max-w-3xl"
    >
      {children}
    </DashboardShell>
  );
}
