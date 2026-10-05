import { z } from "zod";
import type { Coordinates } from "@/lib/utils/geo";
import type { PlaceSuggestion } from "@/types/maps";

const PHOTON_URL = "https://photon.komoot.io/api/";
const TIMEOUT_MS = 5000;
const MAX_RESULTS = 5;
/** Kotak pembatas Indonesia (lon kiri, lat bawah, lon kanan, lat atas). */
const INDONESIA_BBOX = "95,-11,141,6";

const photonResponseSchema = z.object({
  features: z.array(
    z.object({
      geometry: z.object({
        coordinates: z.tuple([z.number(), z.number()]),
      }),
      properties: z
        .object({
          osm_type: z.string(),
          osm_id: z.number(),
          name: z.string(),
          street: z.string(),
          housenumber: z.string(),
          district: z.string(),
          city: z.string(),
          county: z.string(),
          state: z.string(),
        })
        .partial(),
    }),
  ),
});

type PhotonResponse = z.infer<typeof photonResponseSchema>;

/**
 * Ubah FeatureCollection Photon jadi saran. Judul = nama tempat (atau jalan
 * kalau tanpa nama), subjudul = jalan/kecamatan/kota/provinsi tanpa duplikat.
 * Fitur tanpa judul dibuang — tidak ada yang bisa ditampilkan ke User.
 * Judul+subjudul kembar juga dibuang (OSM memecah satu jalan jadi beberapa
 * ruas, yang tampil sebagai saran identik).
 */
export function mapPhotonFeatures(data: PhotonResponse): PlaceSuggestion[] {
  const suggestions: PlaceSuggestion[] = [];
  const seen = new Set<string>();
  data.features.forEach((feature, index) => {
    const p = feature.properties;
    const street = [p.street, p.housenumber].filter(Boolean).join(" ");
    const title = p.name ?? (street || p.city);
    if (!title) return;

    const subtitleParts = [street, p.district, p.city, p.county, p.state]
      .filter((part): part is string => Boolean(part) && part !== title)
      .filter((part, i, parts) => parts.indexOf(part) === i);

    const subtitle = subtitleParts.join(", ");
    const key = `${title}|${subtitle}`;
    if (seen.has(key)) return;
    seen.add(key);

    const [longitude, latitude] = feature.geometry.coordinates;
    suggestions.push({
      id:
        p.osm_type && p.osm_id ? `${p.osm_type}${p.osm_id}` : `photon-${index}`,
      title,
      subtitle,
      coords: { latitude, longitude },
    });
  });
  return suggestions;
}

/**
 * Cari alamat lewat Photon (komoot, data OpenStreetMap) — fallback gratis
 * tanpa API key saat Google tidak dipakai. Gagal apa pun → `[]`, tidak throw.
 */
export async function searchPhoton(
  query: string,
  near: Coordinates | null,
): Promise<PlaceSuggestion[]> {
  try {
    const url = new URL(PHOTON_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(MAX_RESULTS));
    url.searchParams.set("bbox", INDONESIA_BBOX);
    if (near) {
      url.searchParams.set("lat", String(near.latitude));
      url.searchParams.set("lon", String(near.longitude));
    }

    const response = await fetch(url, {
      headers: { "User-Agent": "MyGerai/1.0" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return [];

    const json: unknown = await response.json().catch(() => null);
    const parsed = photonResponseSchema.safeParse(json);
    return parsed.success ? mapPhotonFeatures(parsed.data) : [];
  } catch {
    return [];
  }
}
