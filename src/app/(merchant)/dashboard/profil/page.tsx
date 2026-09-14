import type { Route } from "next";
import Link from "next/link";
import { MerchantProfileForm } from "@/components/merchant/MerchantProfileForm";
import { ArrowRightIcon, ClockIcon, WalletIcon } from "@/components/ui/icons";
import { getMerchantProfile } from "@/server/merchants";

function SettingsLinkRow({
  href,
  icon,
  label,
}: {
  href: Route;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-card border border-line bg-surface px-4 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <ArrowRightIcon className="size-4 text-ink-muted" />
    </Link>
  );
}

export default async function MerchantProfilePage() {
  const profile = await getMerchantProfile();
  if (!profile) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Profil Lapak</h2>
      <SettingsLinkRow
        href="/dashboard/jadwal"
        icon={<ClockIcon className="size-4 text-ink-muted" />}
        label="Jadwal Operasional"
      />
      <SettingsLinkRow
        href="/dashboard/pembayaran"
        icon={<WalletIcon className="size-4 text-ink-muted" />}
        label="Metode Pembayaran"
      />
      <MerchantProfileForm profile={profile} />
    </div>
  );
}
