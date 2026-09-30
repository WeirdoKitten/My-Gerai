"use server";

import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit/limiter";
import type { Coordinates } from "@/lib/utils/geo";

const LOCATIONIQ_BASE_URL = "https://api.locationiq.com/v1";
const GEOCODE_TIMEOUT_MS = 5000;
const SEARCH_RESULT_LIMIT = 5;
/** Setengah lebar kotak (derajat, ~55 km) untuk memprioritaskan hasil di sekitar titik acuan. */
const SEARCH_BIAS_DEGREES = 0.5;

export type AddressSearchResult = Coordinates & { label: string };

const searchQuerySchema = z.string().trim().min(3).max(200);

const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const searchResponseSchema = z.array(
  z.object({
    lat: z.coerce.number(),
    lon: z.coerce.number(),
    display_name: z.string().min(1),
  }),
);

const reverseResponseSchema = z.object({
  display_name: z.string().min(1),
});

/**
 * Pencarian & reverse-geocoding lewat LocationIQ (data OpenStreetMap,
 * paket gratis 5.000 request/hari, maks. 2 request/detik, boleh dipakai
 * dengan peta Leaflet/OSM asal ada atribusi "Search by LocationIQ.com" --
 * dipasang di atribusi peta `LocationMapPicker`). Dipanggil dari server
 * supaya `LOCATIONIQ_API_KEY` tidak bocor ke browser. Terbuka untuk
 * Pembeli (tanpa login), jadi rate limit per IP + batas global sesuai kuota
 * per detik LocationIQ.
 */
async function fetchLocationIq(
  path: "autocomplete" | "reverse",
  params: Record<string, string>,
): Promise<unknown> {
  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey) {
    console.error("LOCATIONIQ_API_KEY belum diisi -- pencarian alamat mati.");
    return null;
  }
  if (!checkRateLimit("locationiq:global", 2, 1000)) return null;

  const url = new URL(`${LOCATIONIQ_BASE_URL}/${path}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("accept-language", "id");
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
    });
    // 404 = "Unable to geocode" (tidak ada hasil), bukan kegagalan.
    if (response.status === 404) return [];
    if (!response.ok) return null;
    return await response.json().catch(() => null);
  } catch {
    return null;
  }
}

/**
 * Data OSM tidak konsisten mengenali singkatan alamat Indonesia -- "Jl.
 * Patrol 3" nol hasil, "Jalan Patrol 3" ada hasil. Kembangkan singkatan
 * umum sebelum dikirim.
 */
function expandAddressAbbreviations(query: string): string {
  return query
    .replace(/\b(jln|jl)\b\.?\s*/gi, "Jalan ")
    .replace(/\bgg\b\.?\s*/gi, "Gang ")
    .trim();
}

/**
 * Autocomplete alamat untuk kotak cari `LocationMapPicker` (dipanggil
 * client dengan debounce). `near` (opsional) hanya memprioritaskan hasil di
 * sekitar titik itu, bukan membatasi. `null` = pencarian gagal
 * (timeout/rate-limit/response invalid), `[]` = tidak ditemukan.
 */
export async function searchAddress(
  query: string,
  near?: Coordinates,
): Promise<AddressSearchResult[] | null> {
  const parsedQuery = searchQuerySchema.safeParse(query);
  if (!parsedQuery.success) return [];
  const parsedNear = near ? coordinatesSchema.safeParse(near) : null;

  const ip = await getClientIp();
  if (!checkRateLimit(`geocode-search:${ip}`, 60, 60_000)) return null;

  const params: Record<string, string> = {
    q: expandAddressAbbreviations(parsedQuery.data),
    countrycodes: "id",
    limit: String(SEARCH_RESULT_LIMIT),
  };
  if (parsedNear?.success) {
    const { latitude, longitude } = parsedNear.data;
    params.viewbox = [
      longitude - SEARCH_BIAS_DEGREES,
      latitude + SEARCH_BIAS_DEGREES,
      longitude + SEARCH_BIAS_DEGREES,
      latitude - SEARCH_BIAS_DEGREES,
    ].join(",");
  }

  const json = await fetchLocationIq("autocomplete", params);
  const parsed = searchResponseSchema.safeParse(json);
  if (!parsed.success) return null;
  return parsed.data.map((item) => ({
    latitude: item.lat,
    longitude: item.lon,
    label: item.display_name,
  }));
}

/**
 * Reverse-geocode titik jadi teks alamat -- label "Pin di: ..." di bawah
 * peta, sekaligus auto-isi "Alamat Lapak" di `/dashboard/profil`. Gagal apa
 * pun -> `null`, TIDAK PERNAH throw: label & auto-isi harus gagal senyap,
 * tidak boleh mem-block Pedagang/Pembeli.
 */
export async function reverseGeocodeAddress(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const parsedCoords = coordinatesSchema.safeParse({ latitude, longitude });
  if (!parsedCoords.success) return null;

  const ip = await getClientIp();
  if (!checkRateLimit(`geocode-reverse:${ip}`, 30, 60_000)) return null;

  // Endpoint reverse default-nya XML (beda dengan autocomplete) -- minta JSON.
  const json = await fetchLocationIq("reverse", {
    format: "json",
    lat: String(parsedCoords.data.latitude),
    lon: String(parsedCoords.data.longitude),
  });
  const parsed = reverseResponseSchema.safeParse(json);
  return parsed.success ? parsed.data.display_name : null;
}
