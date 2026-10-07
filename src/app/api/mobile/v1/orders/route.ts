import { withMerchant } from "@/lib/mobile-api/handler";
import { apiOk } from "@/lib/mobile-api/respond";
import { listMerchantOrders } from "@/server/orders";

/** Antrean Pesanan aktif (sama dengan dashboard web Pedagang). */
export async function GET(request: Request) {
  return withMerchant(request, async () => apiOk(await listMerchantOrders()));
}
