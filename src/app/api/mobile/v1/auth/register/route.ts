import { parseJson, runSafely } from "@/lib/mobile-api/handler";
import { fromActionResult } from "@/lib/mobile-api/respond";
import { registerMerchantSchema } from "@/lib/validation/merchant.schema";
import { registerMerchant } from "@/server/merchants";

/** Daftar Lapak baru. Akun berstatus `pending` sampai disetujui Admin; tidak langsung login. */
export async function POST(request: Request) {
  return runSafely(async () => {
    const input = await parseJson(request, registerMerchantSchema);
    if (input instanceof Response) return input;
    return fromActionResult(await registerMerchant(input));
  });
}
