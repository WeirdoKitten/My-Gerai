import type { Coordinates } from "@/lib/utils/geo";

export const INDONESIA_CENTER: Coordinates = { latitude: -2.5, longitude: 118 };
export const DEFAULT_ZOOM = 4;
export const PICKED_ZOOM = 17;
/** Di bawah zoom ini geseran peta tidak memasang titik — terlalu jauh untuk akurat (mis. masih zoom se-Indonesia). */
export const MIN_PICK_ZOOM = 13;
/** Pergeseran pusat di bawah ini (derajat, ±1 cm) dianggap tidak bergeser — zoom tombol tidak memasang ulang titik. */
export const CENTER_EPSILON = 1e-7;

/** Kendali imperatif peta yang dipakai `LocationMapPicker` (hasil cari / lokasi saya). */
export type MapController = {
  flyTo: (coords: Coordinates) => void;
};

/** Props bersama `LeafletMap` & `GoogleMap` — keduanya pin-tetap-di-tengah. */
export type CenterPinMapProps = {
  value: Coordinates | null;
  initialCenter?: Coordinates;
  radiusKm?: number;
  /** Dipanggil HANYA saat User menggeser/tap peta (bukan saat `flyTo` programatik). */
  onCenterChange: (coords: Coordinates) => void;
  onReady: (controller: MapController) => void;
};

export function movedBeyondEpsilon(a: Coordinates, b: Coordinates): boolean {
  return (
    Math.abs(a.latitude - b.latitude) > CENTER_EPSILON ||
    Math.abs(a.longitude - b.longitude) > CENTER_EPSILON
  );
}
