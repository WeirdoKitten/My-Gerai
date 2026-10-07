import { readJsonObject, withMerchant } from "@/lib/mobile-api/handler";
import { fromActionResult } from "@/lib/mobile-api/respond";
import type { SetOperatingHoursInput } from "@/lib/validation/merchant-hours.schema";
import { setMerchantOperatingHours } from "@/server/merchants";

/** Ganti jadwal operasional mingguan. Body `{ hours: [{ dayOfWeek, openTime, closeTime }] }`. */
export async function PUT(request: Request) {
  return withMerchant(request, async () => {
    const body = await readJsonObject(request);
    if (body instanceof Response) return body;
    return fromActionResult(
      await setMerchantOperatingHours(body.hours as SetOperatingHoursInput),
    );
  });
}
