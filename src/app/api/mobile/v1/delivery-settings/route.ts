import { readJsonObject, withMerchant } from "@/lib/mobile-api/handler";
import { apiOk, fromActionResult } from "@/lib/mobile-api/respond";
import type { UpdateMerchantDeliverySettingsInput } from "@/lib/validation/merchant.schema";
import {
  getMerchantDeliverySettings,
  updateMerchantDeliverySettings,
} from "@/server/merchants";

/** Pengaturan Pesanan Antar (aktif, ongkir tetap, radius). */
export async function GET(request: Request) {
  return withMerchant(request, async () =>
    apiOk(await getMerchantDeliverySettings()),
  );
}

/** Ubah pengaturan Pesanan Antar. */
export async function PATCH(request: Request) {
  return withMerchant(request, async () => {
    const body = await readJsonObject(request);
    if (body instanceof Response) return body;
    return fromActionResult(
      await updateMerchantDeliverySettings(
        body as UpdateMerchantDeliverySettingsInput,
      ),
    );
  });
}
