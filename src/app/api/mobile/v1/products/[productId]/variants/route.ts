import { readJsonObject, withMerchant } from "@/lib/mobile-api/handler";
import { apiOk, fromActionResult } from "@/lib/mobile-api/respond";
import type { SaveProductVariantGroupsInput } from "@/lib/validation/product-variant.schema";
import {
  getProductVariantGroups,
  saveProductVariantGroups,
} from "@/server/product-variants";

/** Grup varian sebuah Item (kosong kalau Item bukan milik Lapak ini). */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/mobile/v1/products/[productId]/variants">,
) {
  return withMerchant(request, async () => {
    const { productId } = await ctx.params;
    return apiOk({ groups: await getProductVariantGroups(productId) });
  });
}

/** Ganti seluruh grup varian Item (`groups: []` = hapus semua varian). */
export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/mobile/v1/products/[productId]/variants">,
) {
  return withMerchant(request, async () => {
    const { productId } = await ctx.params;
    const body = await readJsonObject(request);
    if (body instanceof Response) return body;
    return fromActionResult(
      await saveProductVariantGroups({
        ...body,
        productId,
      } as SaveProductVariantGroupsInput),
    );
  });
}
