"use server";

import { z } from "zod";
import { getMerchantSession } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit/limiter";

const GEOCODE_TIMEOUT_MS = 5000;

const reverseGeocodeResponseSchema = z.object({
  display_name: z.string().min(1),
});

/**
 * Reverse-geocode titik GPS jadi teks alamat lewat Nominatim (OpenStreetMap)
 * — ekosistem sama dengan tile peta yang sudah dipakai `LocationMapPicker`.
 * Dipanggil dari server (bukan client) karena kebijakan penggunaan Nominatim
 * mewajibkan `User-Agent` custom, sebuah header yang tidak bisa di-set dari
 * `fetch` browser (forbidden header). Gagal apa pun (timeout/rate-limit/JSON
 * invalid) -> `null`, TIDAK PERNAH throw -- auto-fill di form profil harus
 * gagal senyap, tidak boleh mem-block Pedagang menyimpan alamat manual.
 */
export async function reverseGeocodeAddress(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const session = await getMerchantSession();
  if (!session) return null;

  if (!checkRateLimit(`geocode:${session.merchantId}`, 20, 60_000)) {
    return null;
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("accept-language", "id");

    const response = await fetch(url, {
      headers: { "User-Agent": "MyGerai/1.0" },
      signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const json: unknown = await response.json().catch(() => null);
    const parsed = reverseGeocodeResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.display_name : null;
  } catch {
    return null;
  }
}
