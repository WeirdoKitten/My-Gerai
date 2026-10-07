import { readFormData, withMerchant } from "@/lib/mobile-api/handler";
import { fromActionResult } from "@/lib/mobile-api/respond";
import { uploadMerchantPhoto } from "@/server/merchants";

/** Unggah foto Lapak (multipart, field `file`, maks 3 MB, JPG/PNG/WebP). */
export async function POST(request: Request) {
  return withMerchant(request, async () => {
    const formData = await readFormData(request);
    if (formData instanceof Response) return formData;
    return fromActionResult(await uploadMerchantPhoto(formData));
  });
}
