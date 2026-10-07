import { withMerchant } from "@/lib/mobile-api/handler";
import { apiOk } from "@/lib/mobile-api/respond";
import { listMerchantOrderHistory } from "@/server/orders";

/** Riwayat Pesanan yang sudah final (sama dengan `/dashboard/riwayat` web). */
export async function GET(request: Request) {
  return withMerchant(request, async () =>
    apiOk({ orders: await listMerchantOrderHistory() }),
  );
}
