import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { NavItem } from "@/components/DashboardNav";
import { DashboardShell } from "@/components/DashboardShell";
import { QrIcon, UserIcon } from "@/components/ui/icons";
import { ToastProvider } from "@/components/ui/Toast";
import { Wordmark } from "@/components/ui/Wordmark";
import { getMerchantSession } from "@/lib/auth/session";
import { logoutMerchant } from "@/server/merchants";

// QR Lapak & Profil = tujuan sesekali (cetak QR sekali, atur profil jarang) →
// ikon di header, bukan tab bawah. Bottom nav disisakan untuk 4 layar harian.
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Pesanan", icon: "receipt" },
  { href: "/dashboard/produk", label: "Item", icon: "tag" },
  { href: "/dashboard/riwayat", label: "Riwayat", icon: "history" },
  { href: "/dashboard/laporan", label: "Laporan", icon: "chart" },
];

const HEADER_ICON_CLASS =
  "flex size-9 items-center justify-center rounded-control border border-line text-ink-muted transition-colors hover:bg-bg hover:text-ink";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getMerchantSession();
  if (!session) redirect("/login");

  return (
    <ToastProvider>
      <DashboardShell
        brand={<Wordmark label={session.stallName} className="text-sm" />}
        nav={NAV}
        logoutAction={logoutMerchant}
        headerAction={
          <>
            <Link
              href="/dashboard/qr"
              aria-label="QR Lapak"
              className={HEADER_ICON_CLASS}
            >
              <QrIcon className="size-4" />
            </Link>
            <Link
              href="/dashboard/profil"
              aria-label="Profil Lapak"
              className={HEADER_ICON_CLASS}
            >
              <UserIcon className="size-4" />
            </Link>
          </>
        }
      >
        {children}
      </DashboardShell>
    </ToastProvider>
  );
}
