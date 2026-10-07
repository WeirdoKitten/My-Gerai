import { z } from "zod";
import { orderStatusEnum } from "@/lib/db/schema";
import { parseJson, withMerchant } from "@/lib/mobile-api/handler";
import { fromActionResult } from "@/lib/mobile-api/respond";
import { updateOrderStatus } from "@/server/orders";

const statusSchema = z.object({
  status: z.enum(orderStatusEnum.enumValues, "Status Pesanan tidak valid."),
});

/** Ubah status Pesanan (diproses, siap, diantar, selesai). Aturan transisi diperiksa `updateOrderStatus`. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/mobile/v1/orders/[orderId]/status">,
) {
  return withMerchant(request, async () => {
    const { orderId } = await ctx.params;
    const input = await parseJson(request, statusSchema);
    if (input instanceof Response) return input;
    return fromActionResult(await updateOrderStatus(orderId, input.status));
  });
}
