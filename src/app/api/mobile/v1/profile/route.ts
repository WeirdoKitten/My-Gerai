import { readJsonObject, withMerchant } from "@/lib/mobile-api/handler";
import { apiOk, fromActionResult } from "@/lib/mobile-api/respond";
import type { UpdateMerchantProfileInput } from "@/lib/validation/merchant.schema";
import { getMerchantProfile, updateMerchantProfile } from "@/server/merchants";

/** Profil Lapak (nama, pemilik, kategori, foto, alamat, titik lokasi, rekening Pencairan). */
export async function GET(request: Request) {
  return withMerchant(request, async () => apiOk(await getMerchantProfile()));
}

/** Ubah profil Lapak. Body = semua field profil (sama dengan form web). */
export async function PATCH(request: Request) {
  return withMerchant(request, async () => {
    const body = await readJsonObject(request);
    if (body instanceof Response) return body;
    return fromActionResult(
      await updateMerchantProfile(body as UpdateMerchantProfileInput),
    );
  });
}
