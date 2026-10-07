import { withMerchant } from "@/lib/mobile-api/handler";
import { apiOk } from "@/lib/mobile-api/respond";
import { getMerchantQrMenu } from "@/server/merchants";

/** URL menu Lapak + gambar QR Menu (data URI) untuk ditampilkan atau dibagikan. */
export async function GET(request: Request) {
  return withMerchant(request, async () => apiOk(await getMerchantQrMenu()));
}
