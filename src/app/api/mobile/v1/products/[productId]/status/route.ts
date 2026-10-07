import { z } from "zod";
import { parseJson, withMerchant } from "@/lib/mobile-api/handler";
import { fromActionResult } from "@/lib/mobile-api/respond";
import { setProductStatus } from "@/server/products";

const productStatusSchema = z.object({
  status: z.enum(["available", "sold_out"], "Status Item tidak valid."),
});

/** Tandai Item tersedia atau habis. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/mobile/v1/products/[productId]/status">,
) {
  return withMerchant(request, async () => {
    const { productId } = await ctx.params;
    const input = await parseJson(request, productStatusSchema);
    if (input instanceof Response) return input;
    return fromActionResult(await setProductStatus(productId, input.status));
  });
}
