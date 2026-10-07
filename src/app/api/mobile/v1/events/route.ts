import { withMerchant } from "@/lib/mobile-api/handler";
import { apiOk } from "@/lib/mobile-api/respond";
import { getMyMerchantEvents } from "@/server/events";

/** Event (Portal EO) yang mengikutsertakan Gerai ini. */
export async function GET(request: Request) {
  return withMerchant(request, async () =>
    apiOk({ events: await getMyMerchantEvents() }),
  );
}
