export type Coordinates = { latitude: number; longitude: number };

const EARTH_RADIUS_KM = 6371;

/**
 * Jarak garis lurus (great-circle) dua titik GPS dalam kilometer — rumus
 * Haversine. Cukup akurat untuk skala kota/pasar, bukan navigasi presisi.
 */
export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(h));
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Format jarak km jadi teks ringkas, mis. "350 m" / "1,2 km". */
export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`;
}

/**
 * Area (lingkaran pusat+radius) yang mencakup satu titik -- kalau lebih dari
 * satu area tumpang tindih, menang yang titik tengahnya paling dekat
 * (keputusan User). `null` kalau tidak ada area yang mencakup titik itu atau
 * `areas` kosong.
 */
export function findNearestArea<
  T extends {
    centerLatitude: number;
    centerLongitude: number;
    radiusKm: number;
  },
>(point: Coordinates, areas: T[]): T | null {
  let nearest: T | null = null;
  let nearestDistanceKm = Number.POSITIVE_INFINITY;

  for (const area of areas) {
    const distanceKm = haversineDistanceKm(point, {
      latitude: area.centerLatitude,
      longitude: area.centerLongitude,
    });
    if (distanceKm <= area.radiusKm && distanceKm < nearestDistanceKm) {
      nearest = area;
      nearestDistanceKm = distanceKm;
    }
  }

  return nearest;
}
