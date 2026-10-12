import { z } from "zod";
import { withMerchant } from "@/lib/mobile-api/handler";
import { apiError, apiOk } from "@/lib/mobile-api/respond";
import { coordinatesSchema } from "@/lib/validation/maps.schema";
import { searchPlaces } from "@/server/geocoding";

const querySchema = z.object({
  q: z.string().trim().min(3, "Ketik minimal 3 huruf.").max(120),
  near: coordinatesSchema.nullable(),
});

/**
 * Saran alamat untuk pemilih lokasi Lapak di aplikasi. Aplikasi memakai peta
 * OSM (WebView Leaflet), jadi selalu dilayani Photon — tanpa kuota Google.
 * `lat`/`lng` opsional untuk mengutamakan hasil di dekat titik saat ini.
 */
export async function GET(request: Request) {
  return withMerchant(request, async () => {
    const params = new URL(request.url).searchParams;
    const lat = params.get("lat");
    const lng = params.get("lng");
    const parsed = querySchema.safeParse({
      q: params.get("q") ?? "",
      near:
        lat !== null && lng !== null
          ? { latitude: Number(lat), longitude: Number(lng) }
          : null,
    });
    if (!parsed.success) {
      return apiError(
        "validation",
        parsed.error.issues[0]?.message ?? "Input tidak valid.",
      );
    }

    const result = await searchPlaces({
      query: parsed.data.q,
      provider: "osm",
      sessionToken: crypto.randomUUID(),
      near: parsed.data.near,
    });
    return apiOk({ suggestions: result.suggestions });
  });
}
