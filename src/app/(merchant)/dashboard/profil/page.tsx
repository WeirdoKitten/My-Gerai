import { MerchantProfileForm } from "@/components/merchant/MerchantProfileForm";
import { getMerchantProfile } from "@/server/merchants";

export default async function MerchantProfilePage() {
  const profile = await getMerchantProfile();
  if (!profile) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Profil Lapak</h2>
      <MerchantProfileForm profile={profile} />
    </div>
  );
}
