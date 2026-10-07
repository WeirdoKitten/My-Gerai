import { authenticateMerchant } from "@/lib/auth/merchant-login";
import { createMerchantToken } from "@/lib/auth/session";
import { parseJson, runSafely } from "@/lib/mobile-api/handler";
import { apiOk, fromActionResult } from "@/lib/mobile-api/respond";
import { getClientIp } from "@/lib/rate-limit/limiter";
import { loginMerchantSchema } from "@/lib/validation/merchant.schema";

/**
 * Login aplikasi: No. HP + password → token Bearer (sesi mobile 90 hari,
 * diperpanjang otomatis selama dipakai). Lapak yang belum disetujui/ditolak/
 * dinonaktifkan mendapat `status` + `message`, tanpa token.
 */
export async function POST(request: Request) {
  return runSafely(async () => {
    const input = await parseJson(request, loginMerchantSchema);
    if (input instanceof Response) return input;

    const result = await authenticateMerchant(input, await getClientIp());
    if (!result.ok) return fromActionResult(result);
    if (result.status !== "approved") {
      return apiOk({ status: result.status, message: result.message });
    }

    const token = await createMerchantToken(result.merchantId, "mobile");
    return apiOk({ status: "approved", token });
  });
}
