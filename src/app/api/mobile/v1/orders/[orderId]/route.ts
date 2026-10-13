import { withMerchant } from "@/lib/mobile-api/handler";
import { fromActionResult } from "@/lib/mobile-api/respond";
import { getMerchantOrder } from "@/server/orders";

/** Detail satu Pesanan milik Lapak sendiri: `{ kind: "active" | "history", order }`. */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/mobile/v1/orders/[orderId]">,
) {
  return withMerchant(request, async () => {
    const { orderId } = await ctx.params;
    return fromActionResult(await getMerchantOrder(orderId));
  });
}
