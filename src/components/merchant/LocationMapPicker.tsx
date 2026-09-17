"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { Button } from "@/components/ui/Button";
import type { Coordinates } from "@/lib/utils/geo";

// L.Icon.Default menebak path asset ikon marker dari pipeline webpack
// klasik -- tidak berlaku di Next.js, hasilnya ikon default patah. Override
// ke asset yang sudah dicopy ke public/leaflet/ (lihat public/leaflet/).
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

const INDONESIA_CENTER: [number, number] = [-2.5, 118];
const DEFAULT_ZOOM = 4;
const PICKED_ZOOM = 16;

function ClickToPlace({ onPlace }: { onPlace: (coords: Coordinates) => void }) {
  useMapEvents({
    click(e) {
      onPlace({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}

/** MapContainer cuma pakai center/zoom sekali saat mount -- perlu flyTo manual biar ikut pindah saat lokasi diisi lewat tombol "pakai lokasi saya sekarang". */
function RecenterOnChange({ target }: { target: Coordinates | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.latitude, target.longitude], PICKED_ZOOM);
  }, [target, map]);
  return null;
}

export function LocationMapPicker({
  value,
  onChange,
  radiusKm,
}: {
  value: Coordinates | null;
  onChange: (coords: Coordinates | null) => void;
  /** Opsional -- kalau diisi, gambar lingkaran radius (km) di sekitar `value` (dipakai Admin memilih cakupan Area Lapak). */
  radiusKm?: number;
}) {
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [recenterTarget, setRecenterTarget] = useState<Coordinates | null>(
    null,
  );

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Perangkat/browser ini tidak mendukung deteksi lokasi.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        onChange(coords);
        setRecenterTarget(coords);
        setLocating(false);
      },
      () => {
        setGeoError(
          "Tidak bisa mendapat lokasi otomatis. Tap peta di bawah untuk pasang titik manual.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [onChange]);

  return (
    <div className="flex flex-col gap-2">
      <div className="h-64 w-full overflow-hidden rounded-xl border border-line">
        <MapContainer
          center={value ? [value.latitude, value.longitude] : INDONESIA_CENTER}
          zoom={value ? PICKED_ZOOM : DEFAULT_ZOOM}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPlace onPlace={onChange} />
          <RecenterOnChange target={recenterTarget} />
          {value ? (
            <Marker
              position={[value.latitude, value.longitude]}
              draggable
              eventHandlers={{
                dragend: (event) => {
                  const marker = event.target as L.Marker;
                  const pos = marker.getLatLng();
                  onChange({ latitude: pos.lat, longitude: pos.lng });
                },
              }}
            />
          ) : null}
          {value && radiusKm ? (
            <Circle
              center={[value.latitude, value.longitude]}
              radius={radiusKm * 1000}
              pathOptions={{ color: "#ea580c", fillOpacity: 0.12 }}
            />
          ) : null}
        </MapContainer>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={locating}
          onClick={handleUseCurrentLocation}
        >
          Pakai lokasi saya sekarang
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
          >
            Hapus lokasi
          </Button>
        ) : null}
      </div>
      {geoError ? (
        <span className="text-xs font-medium text-danger">{geoError}</span>
      ) : (
        <span className="text-xs text-ink-muted">
          {value
            ? `${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`
            : "Tap peta untuk pasang titik lokasi, atau pakai tombol di atas."}
        </span>
      )}
    </div>
  );
}
