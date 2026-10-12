import { withMerchant } from "@/lib/mobile-api/handler";
import { apiError, apiOk } from "@/lib/mobile-api/respond";
import { coordinatesSchema } from "@/lib/validation/maps.schema";
import { reverseGeocodeAddress } from "@/server/geocoding";

/**
 * Teks alamat dari titik GPS (Nominatim), untuk mengisi otomatis alamat Lapak
 * setelah pin dipindah. `address: null` kalau gagal/kena rate limit — aplikasi
 * diam saja dan Pedagang tetap bisa mengetik alamat sendiri.
 */
export async function GET(request: Request) {
  return withMerchant(request, async () => {
    const params = new URL(request.url).searchParams;
    const parsed = coordinatesSchema.safeParse({
      latitude: Number(params.get("lat") ?? Number.NaN),
      longitude: Number(params.get("lng") ?? Number.NaN),
    });
    if (!parsed.success) {
      return apiError("validation", "Titik lokasi tidak valid.");
    }

    const address = await reverseGeocodeAddress(
      parsed.data.latitude,
      parsed.data.longitude,
    );
    return apiOk({ address });
  });
}
