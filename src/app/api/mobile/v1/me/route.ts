import { withMerchant } from "@/lib/mobile-api/handler";
import { apiOk } from "@/lib/mobile-api/respond";
import { getMerchantProfile } from "@/server/merchants";

/** Identitas Pedagang yang sedang login + profil Lapak. Dipakai aplikasi saat dibuka untuk cek token. */
export async function GET(request: Request) {
  return withMerchant(request, async ({ session }) => {
    return apiOk({
      merchantId: session.merchantId,
      slug: session.slug,
      stallName: session.stallName,
      profile: await getMerchantProfile(),
    });
  });
}
