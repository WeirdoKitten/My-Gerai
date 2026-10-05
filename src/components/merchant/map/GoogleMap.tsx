"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useEffect, useRef, useState } from "react";
import type { Coordinates } from "@/lib/utils/geo";
import {
  type CenterPinMapProps,
  DEFAULT_ZOOM,
  INDONESIA_CENTER,
  MIN_PICK_ZOOM,
  movedBeyondEpsilon,
  PICKED_ZOOM,
} from "./types";

declare global {
  interface Window {
    /** Dipanggil Maps JS saat key ditolak (referrer salah, billing mati, dsb). */
    gm_authFailure?: () => void;
  }
}

/** `setOptions` hanya boleh sekali per halaman — key sama sepanjang runtime. */
let optionsSet = false;

function toLatLng(coords: Coordinates): google.maps.LatLngLiteral {
  return { lat: coords.latitude, lng: coords.longitude };
}

/**
 * Peta Google Maps JS dengan pin tetap di tengah — mode utama kalau Google
 * aktif. Script/key gagal (`importLibrary` reject atau `gm_authFailure`) →
 * `onLoadError`, `LocationMapPicker` pindah ke Leaflet/OSM.
 */
export function GoogleMap({
  browserKey,
  value,
  initialCenter,
  radiusKm,
  onCenterChange,
  onReady,
  onLoadError,
}: CenterPinMapProps & { browserKey: string; onLoadError: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const onCenterChangeRef = useRef(onCenterChange);
  onCenterChangeRef.current = onCenterChange;
  const onLoadErrorRef = useRef(onLoadError);
  onLoadErrorRef.current = onLoadError;
  // Nilai awal saja — perubahan berikutnya lewat `flyTo`, bukan re-init peta.
  const startRef = useRef({ value, initialCenter });

  useEffect(() => {
    let cancelled = false;
    const listeners: google.maps.MapsEventListener[] = [];
    window.gm_authFailure = () => onLoadErrorRef.current();

    async function init() {
      if (!optionsSet) {
        setOptions({
          key: browserKey,
          v: "weekly",
          language: "id",
          region: "ID",
        });
        optionsSet = true;
      }
      const { Map: GMap } = await importLibrary("maps");
      if (cancelled || !containerRef.current) return;

      const { value: v, initialCenter: ic } = startRef.current;
      const start = v ?? ic ?? INDONESIA_CENTER;
      const map = new GMap(containerRef.current, {
        center: toLatLng(start),
        zoom: v || ic ? PICKED_ZOOM - 1 : DEFAULT_ZOOM,
        // Satu jari menggeser peta, sama dengan perilaku Leaflet sebelumnya.
        gestureHandling: "greedy",
        clickableIcons: false,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });
      mapRef.current = map;
      setMapReady(true);

      // Peta "idle" setelah setiap gerakan selesai (termasuk inersia). Gerakan
      // dari `flyTo` ditandai programatik supaya tidak dilaporkan ulang.
      let programmatic = true; // idle pertama = render awal
      let lastCenter: Coordinates = start;
      const readCenter = (): Coordinates => {
        const c = map.getCenter();
        return c ? { latitude: c.lat(), longitude: c.lng() } : lastCenter;
      };

      listeners.push(
        map.addListener("dragstart", () => {
          programmatic = false;
        }),
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          programmatic = false;
          if (e.latLng) map.panTo(e.latLng);
        }),
        map.addListener("idle", () => {
          const center = readCenter();
          const previous = lastCenter;
          lastCenter = center;
          if (programmatic) {
            programmatic = false;
            return;
          }
          if ((map.getZoom() ?? 0) < MIN_PICK_ZOOM) return;
          if (!movedBeyondEpsilon(previous, center)) return;
          onCenterChangeRef.current(center);
        }),
      );

      onReady({
        flyTo: (coords) => {
          programmatic = true;
          map.panTo(toLatLng(coords));
          map.setZoom(PICKED_ZOOM);
        },
      });
    }

    init().catch(() => {
      if (!cancelled) onLoadErrorRef.current();
    });

    return () => {
      cancelled = true;
      for (const listener of listeners) listener.remove();
      circleRef.current?.setMap(null);
      circleRef.current = null;
      mapRef.current = null;
      window.gm_authFailure = undefined;
    };
  }, [browserKey, onReady]);

  // Lingkaran radius Area (Admin) mengikuti titik terpilih.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!value || !radiusKm) {
      circleRef.current?.setMap(null);
      circleRef.current = null;
      return;
    }
    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        map,
        strokeColor: "#ea580c",
        strokeWeight: 2,
        fillColor: "#ea580c",
        fillOpacity: 0.12,
        clickable: false,
      });
    }
    circleRef.current.setCenter(toLatLng(value));
    circleRef.current.setRadius(radiusKm * 1000);
  }, [value, radiusKm, mapReady]);

  return <div ref={containerRef} className="h-full w-full" />;
}
