"use server";

import { z } from "zod";
import { getMerchantSession } from "@/lib/auth/session";
import {
  getGooglePlaceLocation,
  googleAutocomplete,
} from "@/lib/maps/google-places";
import { searchPhoton } from "@/lib/maps/photon";
import {
  getGoogleMapsKeys,
  getMonthlyLimit,
  isBreakerOpen,
  isWithinBudget,
  tripBreaker,
} from "@/lib/maps/usage";
import { consumeBudget, readMonthlyUsage } from "@/lib/maps/usage-store";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit/limiter";
import {
  type ResolvePlaceInput,
  resolvePlaceSchema,
  type SearchPlacesInput,
  searchPlacesSchema,
} from "@/lib/validation/maps.schema";
import type {
  MapProviderConfig,
  ResolvePlaceResult,
  SearchPlacesResult,
} from "@/types/maps";

const GEOCODE_TIMEOUT_MS = 5000;

/** Per IP — map picker dipakai Pembeli tanpa akun (checkout Diantar). */
const MAP_PROVIDER_RATE_LIMIT = 20;
const PLACES_RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

/**
 * Tentukan provider peta untuk SATU picker yang baru dibuka: Google kalau
 * dikonfigurasi, circuit breaker tertutup, dan semua SKU masih di bawah batas
 * bulanan — selain itu OSM. Sekaligus mencatat 1 map load Google (ditagih per
 * load, server tidak melihatnya di titik lain). Browser key sengaja dikirim
 * lewat sini (runtime), bukan `NEXT_PUBLIC_*` yang ter-inline saat build.
 * Key ini memang publik (dipakai `<script>` Maps JS) — amannya lewat
 * restriksi HTTP referrer + API di Google Cloud Console, bukan kerahasiaan.
 * Gagal apa pun → OSM, tidak pernah throw.
 */
export async function getMapProvider(): Promise<MapProviderConfig> {
  const keys = getGoogleMapsKeys();
  if (!keys || isBreakerOpen()) return { provider: "osm" };

  try {
    const ip = await getClientIp();
    if (
      !checkRateLimit(
        `map-provider:${ip}`,
        MAP_PROVIDER_RATE_LIMIT,
        RATE_WINDOW_MS,
      )
    ) {
      return { provider: "osm" };
    }
    const limit = getMonthlyLimit();
    if (!isWithinBudget(await readMonthlyUsage(), limit)) {
      return { provider: "osm" };
    }
    if (!(await consumeBudget("map_load", limit))) return { provider: "osm" };
    return { provider: "google", browserKey: keys.browserKey };
  } catch {
    return { provider: "osm" };
  }
}

/**
 * Saran alamat untuk kotak cari map picker. Client yang sedang mode Google
 * dilayani Google Places; kalau Google tidak tersedia/habis kuota/gagal,
 * otomatis dilayani Photon dan `provider: "osm"` di hasil memberi tahu client
 * untuk ikut pindah ke peta OSM. Input tidak valid / rate limit → daftar
 * kosong. Tidak pernah throw.
 */
export async function searchPlaces(
  input: SearchPlacesInput,
): Promise<SearchPlacesResult> {
  const parsed = searchPlacesSchema.safeParse(input);
  if (!parsed.success) return { provider: "osm", suggestions: [] };
  const { query, provider, sessionToken } = parsed.data;
  const near = parsed.data.near ?? null;

  const ip = await getClientIp();
  if (!checkRateLimit(`places:${ip}`, PLACES_RATE_LIMIT, RATE_WINDOW_MS)) {
    return { provider, suggestions: [] };
  }

  const keys = getGoogleMapsKeys();
  if (provider === "google" && keys && !isBreakerOpen()) {
    try {
      if (await consumeBudget("autocomplete", getMonthlyLimit())) {
        const suggestions = await googleAutocomplete({
          apiKey: keys.serverKey,
          query,
          sessionToken,
          near,
        });
        return { provider: "google", suggestions };
      }
    } catch {
      tripBreaker();
    }
  }

  return { provider: "osm", suggestions: await searchPhoton(query, near) };
}

/**
 * Koordinat saran Google yang dipilih (Place Details, menutup sesi
 * autocomplete). Gagal → `fallbackToOsm: true`, client pindah ke peta OSM
 * dan User diminta mencari ulang. Tidak pernah throw.
 */
export async function resolvePlace(
  input: ResolvePlaceInput,
): Promise<ResolvePlaceResult> {
  const parsed = resolvePlaceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fallbackToOsm: false };

  const ip = await getClientIp();
  if (!checkRateLimit(`places:${ip}`, PLACES_RATE_LIMIT, RATE_WINDOW_MS)) {
    return { ok: false, fallbackToOsm: false };
  }

  const keys = getGoogleMapsKeys();
  if (!keys || isBreakerOpen()) return { ok: false, fallbackToOsm: true };

  try {
    if (!(await consumeBudget("place_details", getMonthlyLimit()))) {
      return { ok: false, fallbackToOsm: true };
    }
    const coords = await getGooglePlaceLocation({
      apiKey: keys.serverKey,
      placeId: parsed.data.placeId,
      sessionToken: parsed.data.sessionToken,
    });
    return { ok: true, coords };
  } catch {
    tripBreaker();
    return { ok: false, fallbackToOsm: true };
  }
}

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
