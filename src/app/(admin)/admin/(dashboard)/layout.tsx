import type { Route } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { getAdminSession } from "@/lib/auth/admin-session";
import { logoutAdmin } from "@/server/admins";

const NAV: { href: Route; label: string }[] = [
  { href: "/admin/merchants", label: "Pedagang" },
  { href: "/admin/config", label: "Konfigurasi" },
  { href: "/admin/payouts", label: "Pencairan" },
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
      heading={`Admin · ${session.name}`}
      nav={NAV}
      logoutAction={logoutAdmin}
      width="max-w-3xl"
    >
      {children}
    </DashboardShell>
  );
}
