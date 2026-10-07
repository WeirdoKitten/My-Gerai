import { readJsonObject, withMerchant } from "@/lib/mobile-api/handler";
import { fromActionResult } from "@/lib/mobile-api/respond";
import type { UpdateProductInput } from "@/lib/validation/product.schema";
import { updateProduct } from "@/server/products";

/** Ubah Item. Body = semua field Item (sama dengan form web); kepemilikan dicek `updateProduct`. */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/mobile/v1/products/[productId]">,
) {
  return withMerchant(request, async () => {
    const { productId } = await ctx.params;
    const body = await readJsonObject(request);
    if (body instanceof Response) return body;
    return fromActionResult(
      await updateProduct({ ...body, productId } as UpdateProductInput),
    );
  });
}
