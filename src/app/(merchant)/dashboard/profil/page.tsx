import Link from "next/link";
import { MerchantProfileForm } from "@/components/merchant/MerchantProfileForm";
import { ArrowRightIcon, ClockIcon } from "@/components/ui/icons";
import { getMerchantProfile } from "@/server/merchants";

export default async function MerchantProfilePage() {
  const profile = await getMerchantProfile();
  if (!profile) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Profil Lapak</h2>
      <Link
        href="/dashboard/jadwal"
        className="flex items-center justify-between rounded-card border border-line bg-surface px-4 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
      >
        <span className="flex items-center gap-2">
          <ClockIcon className="size-4 text-ink-muted" />
          Jadwal Operasional
        </span>
        <ArrowRightIcon className="size-4 text-ink-muted" />
      </Link>
      <MerchantProfileForm profile={profile} />
    </div>
  );
}
