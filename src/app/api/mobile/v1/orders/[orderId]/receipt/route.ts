import { withMerchant } from "@/lib/mobile-api/handler";
import { fromActionResult } from "@/lib/mobile-api/respond";
import { getOrderReceipt } from "@/server/orders";

/** Data struk Pesanan yang sudah dibayar. Aplikasi menyusun byte ESC/POS sendiri dari data ini. */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/mobile/v1/orders/[orderId]/receipt">,
) {
  return withMerchant(request, async () => {
    const { orderId } = await ctx.params;
    return fromActionResult(await getOrderReceipt(orderId));
  });
}
