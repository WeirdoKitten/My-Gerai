import { readJsonObject, withMerchant } from "@/lib/mobile-api/handler";
import { apiOk, fromActionResult } from "@/lib/mobile-api/respond";
import type { CreateProductInput } from "@/lib/validation/product.schema";
import { createProduct, listMerchantProducts } from "@/server/products";

/** Semua Item milik Lapak (termasuk yang habis/nonaktif). */
export async function GET(request: Request) {
  return withMerchant(request, async () =>
    apiOk({ products: await listMerchantProducts() }),
  );
}

/** Tambah Item. Validasi lengkap di `createProduct`. */
export async function POST(request: Request) {
  return withMerchant(request, async () => {
    const body = await readJsonObject(request);
    if (body instanceof Response) return body;
    return fromActionResult(await createProduct(body as CreateProductInput));
  });
}
