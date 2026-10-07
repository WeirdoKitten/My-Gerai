import { withMerchant } from "@/lib/mobile-api/handler";
import { fromActionResult } from "@/lib/mobile-api/respond";
import { markQrisPribadiOrderPaid } from "@/server/orders";

/** Mode QRIS Pribadi: Pedagang menandai Pesanan sudah dibayar setelah cek mutasi sendiri. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/mobile/v1/orders/[orderId]/mark-paid">,
) {
  return withMerchant(request, async () => {
    const { orderId } = await ctx.params;
    return fromActionResult(await markQrisPribadiOrderPaid(orderId));
  });
}
