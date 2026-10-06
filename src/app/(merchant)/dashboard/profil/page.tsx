import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MerchantProfileForm } from "@/components/merchant/MerchantProfileForm";
import { SoundSettingRow } from "@/components/merchant/SoundSettingRow";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  StarIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { getMyMerchantEvents } from "@/server/events";
import { getMerchantProfile } from "@/server/merchants";
import { hasAnyProduct } from "@/server/products";

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
  if (!(await hasAnyProduct())) redirect("/dashboard/produk");

  const [profile, merchantEvents] = await Promise.all([
    getMerchantProfile(),
    getMyMerchantEvents(),
  ]);
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
      <SettingsLinkRow
        href="/dashboard/pengantaran"
        icon={<MapPinIcon className="size-4 text-ink-muted" />}
        label="Pengantaran"
      />
      <SettingsLinkRow
        href="/dashboard/ulasan"
        icon={<StarIcon className="size-4 text-ink-muted" />}
        label="Rating & Ulasan"
      />
      {merchantEvents.length > 0 ? (
        <Card className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <CalendarIcon className="size-4 text-ink-muted" />
            Gerai kamu ikut event
          </p>
          <ul className="flex flex-col gap-1.5">
            {merchantEvents.map((event) => (
              <li
                key={event.slug}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0 truncate text-ink">
                  {event.name}{" "}
                  <span className="text-ink-muted">
                    · {event.organizationName}
                  </span>
                </span>
                <Badge tone={event.isActive ? "success" : "neutral"}>
                  {event.isActive ? "Aktif" : "Selesai"}
                </Badge>
              </li>
            ))}
          </ul>
          <p className="text-xs text-ink-muted">
            Pesanan dari event ditandai di kartu Pesanan dan diambil Pembeli
            langsung di Gerai.
          </p>
        </Card>
      ) : null}
      <SoundSettingRow />
      <MerchantProfileForm profile={profile} />
    </div>
  );
}
