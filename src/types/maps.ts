import type { Coordinates } from "@/lib/utils/geo";

/** Penyedia peta + pencarian alamat. Satu picker selalu satu paket (ToS Google: hasil Places hanya di peta Google). */
export type MapProviderName = "google" | "osm";

/** Hasil `getMapProvider` — browser key hanya dikirim kalau mode Google aktif. */
export type MapProviderConfig =
  | { provider: "google"; browserKey: string }
  | { provider: "osm" };

/**
 * Satu saran alamat di dropdown kotak cari. `coords` langsung terisi untuk
 * Photon; untuk Google `null` (koordinat diambil lewat `resolvePlace` saat
 * dipilih, supaya autocomplete dalam satu sesi tidak ditagih per ketikan).
 */
export type PlaceSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  coords: Coordinates | null;
};

/** `provider` = yang BENAR-BENAR dipakai server — `osm` padahal client minta `google` berarti Google gagal/habis kuota, client harus ikut pindah ke peta OSM. */
export type SearchPlacesResult = {
  provider: MapProviderName;
  suggestions: PlaceSuggestion[];
};

export type ResolvePlaceResult =
  | { ok: true; coords: Coordinates }
  | { ok: false; fallbackToOsm: boolean };
