import { z } from "zod";
import { deliveryFailureReasonEnum } from "@/lib/db/schema";
import { parseJson, withMerchant } from "@/lib/mobile-api/handler";
import { fromActionResult } from "@/lib/mobile-api/respond";
import { markDeliveryFailed } from "@/server/orders";

const deliveryFailedSchema = z.object({
  reason: z.enum(
    deliveryFailureReasonEnum.enumValues,
    "Alasan gagal antar tidak valid.",
  ),
  note: z.string().max(500).default(""),
});

/** Tandai Pesanan antar gagal diantar (Fase 11). */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/mobile/v1/orders/[orderId]/delivery-failed">,
) {
  return withMerchant(request, async () => {
    const { orderId } = await ctx.params;
    const input = await parseJson(request, deliveryFailedSchema);
    if (input instanceof Response) return input;
    return fromActionResult(
      await markDeliveryFailed(orderId, input.reason, input.note),
    );
  });
}
