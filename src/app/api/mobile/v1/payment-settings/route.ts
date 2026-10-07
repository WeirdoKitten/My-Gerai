import { withMerchant } from "@/lib/mobile-api/handler";
import { apiOk } from "@/lib/mobile-api/respond";
import { getMerchantPaymentSettings } from "@/server/merchants";

/** Mode pembayaran Lapak (gateway / QRIS Pribadi) dan foto QRIS. Mode hanya bisa diubah Admin. */
export async function GET(request: Request) {
  return withMerchant(request, async () =>
    apiOk(await getMerchantPaymentSettings()),
  );
}
