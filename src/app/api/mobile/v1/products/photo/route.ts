import { readFormData, withMerchant } from "@/lib/mobile-api/handler";
import { fromActionResult } from "@/lib/mobile-api/respond";
import { uploadProductPhoto } from "@/server/products";

/** Unggah foto Item (multipart, field `file`, maks 3 MB, JPG/PNG/WebP). Hasil URL dipakai saat simpan Item. */
export async function POST(request: Request) {
  return withMerchant(request, async () => {
    const formData = await readFormData(request);
    if (formData instanceof Response) return formData;
    return fromActionResult(await uploadProductPhoto(formData));
  });
}
