import { withMerchant } from "@/lib/mobile-api/handler";
import { apiOk } from "@/lib/mobile-api/respond";
import { listMerchantReviews } from "@/server/reviews";

/** Rating & ulasan Gerai dari Pembeli, beserta ringkasan bintang. */
export async function GET(request: Request) {
  return withMerchant(request, async () => apiOk(await listMerchantReviews()));
}
