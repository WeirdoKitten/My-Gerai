import { withMerchant } from "@/lib/mobile-api/handler";
import { apiOk } from "@/lib/mobile-api/respond";
import { getMyPayoutSummary } from "@/server/payouts";

/** Saldo yang belum dicairkan + riwayat Pencairan Lapak sendiri. */
export async function GET(request: Request) {
  return withMerchant(request, async () => apiOk(await getMyPayoutSummary()));
}
