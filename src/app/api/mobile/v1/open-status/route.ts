import { z } from "zod";
import { parseJson, withMerchant } from "@/lib/mobile-api/handler";
import { apiOk, fromActionResult } from "@/lib/mobile-api/respond";
import { getMerchantOpenStatus, toggleMerchantOpen } from "@/server/merchants";

const toggleSchema = z.object({
  state: z.enum(["open", "closed"], "Pilihan buka/tutup tidak valid."),
});

/** Status buka/tutup Lapak saat ini + jadwal operasional. */
export async function GET(request: Request) {
  return withMerchant(request, async () =>
    apiOk(await getMerchantOpenStatus()),
  );
}

/** Buka atau tutup Lapak sekarang (override manual, sama dengan tombol di web). */
export async function POST(request: Request) {
  return withMerchant(request, async () => {
    const input = await parseJson(request, toggleSchema);
    if (input instanceof Response) return input;
    return fromActionResult(await toggleMerchantOpen(input.state));
  });
}
