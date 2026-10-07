import { revokeMerchantSessionByToken } from "@/lib/auth/session";
import { withMerchant } from "@/lib/mobile-api/handler";
import { apiOk } from "@/lib/mobile-api/respond";

/** Cabut token sesi ini. Token push perangkat ikut terhapus (cascade), jadi HP berhenti menerima notifikasi. */
export async function POST(request: Request) {
  return withMerchant(request, async ({ token }) => {
    await revokeMerchantSessionByToken(token);
    return apiOk({});
  });
}
