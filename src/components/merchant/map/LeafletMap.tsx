"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { Circle, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { Coordinates } from "@/lib/utils/geo";
import {
  type CenterPinMapProps,
  DEFAULT_ZOOM,
  INDONESIA_CENTER,
  MIN_PICK_ZOOM,
  movedBeyondEpsilon,
  PICKED_ZOOM,
} from "./types";

/**
 * Hubungkan event Leaflet ke kontrak pin-tengah: User menggeser/tap peta →
 * `onCenterChange(pusat)`; `flyTo` programatik ditandai supaya `moveend`-nya
 * tidak ikut dilaporkan (mencegah reverse-geocode ganda di profil Pedagang).
 */
function CenterPinBridge({
  onCenterChange,
  onReady,
}: Pick<CenterPinMapProps, "onCenterChange" | "onReady">) {
  const map = useMap();
  const programmaticRef = useRef(false);
  const lastCenterRef = useRef<Coordinates | null>(null);
  const onCenterChangeRef = useRef(onCenterChange);
  onCenterChangeRef.current = onCenterChange;

  useEffect(() => {
    const readCenter = (): Coordinates => {
      const c = map.getCenter();
      return { latitude: c.lat, longitude: c.lng };
    };
    lastCenterRef.current = readCenter();

    onReady({
      flyTo: (coords) => {
        programmaticRef.current = true;
        map.flyTo([coords.latitude, coords.longitude], PICKED_ZOOM, {
          duration: 0.8,
        });
      },
    });

    const handleMoveEnd = () => {
      const center = readCenter();
      const previous = lastCenterRef.current;
      lastCenterRef.current = center;
      if (programmaticRef.current) {
        programmaticRef.current = false;
        return;
      }
      if (map.getZoom() < MIN_PICK_ZOOM) return;
      if (previous && !movedBeyondEpsilon(previous, center)) return;
      onCenterChangeRef.current(center);
    };
    // Tap peta = pusatkan ke titik itu (moveend berikutnya melaporkan pusat baru).
    const handleClick = (e: { latlng: { lat: number; lng: number } }) => {
      programmaticRef.current = false;
      map.panTo(e.latlng);
    };
    // Jaga-jaga kalau flyTo tidak memicu moveend (target = posisi sekarang):
    // geseran User selalu dihitung sebagai geseran User.
    const handleDragStart = () => {
      programmaticRef.current = false;
    };

    map.on("moveend", handleMoveEnd);
    map.on("click", handleClick);
    map.on("dragstart", handleDragStart);
    return () => {
      map.off("dragstart", handleDragStart);
      map.off("moveend", handleMoveEnd);
      map.off("click", handleClick);
    };
  }, [map, onReady]);

  return null;
}

/** Peta OSM (Leaflet) dengan pin tetap di tengah — mode cadangan/default tanpa Google. */
export function LeafletMap({
  value,
  initialCenter,
  radiusKm,
  onCenterChange,
  onReady,
}: CenterPinMapProps) {
  const start = value ?? initialCenter ?? INDONESIA_CENTER;
  return (
    <MapContainer
      center={[start.latitude, start.longitude]}
      zoom={value || initialCenter ? PICKED_ZOOM - 1 : DEFAULT_ZOOM}
      scrollWheelZoom={false}
      // Zoom selalu di pusat supaya pinch/double-tap tidak menggeser titik.
      touchZoom="center"
      doubleClickZoom="center"
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CenterPinBridge onCenterChange={onCenterChange} onReady={onReady} />
      {value && radiusKm ? (
        <Circle
          center={[value.latitude, value.longitude]}
          radius={radiusKm * 1000}
          pathOptions={{ color: "#ea580c", fillOpacity: 0.12 }}
        />
      ) : null}
    </MapContainer>
  );
}
