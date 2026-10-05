"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { MapPinIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils/cn";
import type { Coordinates } from "@/lib/utils/geo";
import { getMapProvider } from "@/server/geocoding";
import type { MapProviderConfig } from "@/types/maps";
import { PlaceSearchBox } from "./map/PlaceSearchBox";
import type { MapController } from "./map/types";

function MapLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-neutral-bg text-ink-muted">
      <Spinner className="size-6" />
    </div>
  );
}

// Dipisah per provider: mode Google tidak memuat Leaflet, mode OSM tidak
// memuat loader Google.
const LeafletMap = dynamic(
  () => import("./map/LeafletMap").then((mod) => mod.LeafletMap),
  { ssr: false, loading: MapLoading },
);
const GoogleMap = dynamic(
  () => import("./map/GoogleMap").then((mod) => mod.GoogleMap),
  { ssr: false, loading: MapLoading },
);

/**
 * Pemilih titik lokasi: kotak cari alamat + peta dengan pin tetap di tengah
 * (geser peta untuk memindah titik) + "Pakai lokasi saya sekarang". Provider
 * ditentukan server (`getMapProvider`): Google kalau aktif & kuota aman,
 * selain itu OSM (Leaflet + Photon). Google gagal kapan pun → pindah ke OSM
 * tanpa reload. Dipakai profil Pedagang, checkout Diantar, dan Area Admin.
 */
export function LocationMapPicker({
  value,
  onChange,
  radiusKm,
  initialCenter,
}: {
  value: Coordinates | null;
  onChange: (coords: Coordinates | null) => void;
  /** Opsional -- kalau diisi, gambar lingkaran radius (km) di sekitar `value` (dipakai Admin memilih cakupan Area Lapak). */
  radiusKm?: number;
  /** Opsional -- titik awal peta saat `value` masih kosong (mis. lokasi Lapak di checkout Pesanan Antar). */
  initialCenter?: Coordinates;
}) {
  const [config, setConfig] = useState<MapProviderConfig | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const controllerRef = useRef<MapController | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMapProvider()
      .catch((): MapProviderConfig => ({ provider: "osm" }))
      .then((result) => {
        if (!cancelled) setConfig(result);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleReady = useCallback((controller: MapController) => {
    controllerRef.current = controller;
  }, []);

  const fallBackToOsm = useCallback(() => {
    controllerRef.current = null;
    setConfig({ provider: "osm" });
  }, []);

  /** Titik dari hasil cari / GPS: set nilai lalu terbangkan peta ke sana. */
  const placeAt = useCallback(
    (coords: Coordinates) => {
      onChange(coords);
      controllerRef.current?.flyTo(coords);
    },
    [onChange],
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
        placeAt({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        setGeoError(
          "Tidak bisa mendapat lokasi otomatis. Cari alamat atau geser peta untuk memasang titik.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [placeAt]);

  const mapProps = {
    value,
    initialCenter,
    radiusKm,
    onCenterChange: onChange,
    onReady: handleReady,
  };

  return (
    <div className="flex flex-col gap-2">
      {config ? (
        <PlaceSearchBox
          provider={config.provider}
          near={value ?? initialCenter ?? null}
          onPick={placeAt}
          onProviderFallback={fallBackToOsm}
        />
      ) : null}
      <div className="relative h-64 w-full overflow-hidden rounded-xl border border-line">
        {!config ? (
          <MapLoading />
        ) : config.provider === "google" ? (
          <GoogleMap
            {...mapProps}
            browserKey={config.browserKey}
            onLoadError={fallBackToOsm}
          />
        ) : (
          <LeafletMap {...mapProps} />
        )}
        {config ? (
          // Pin tetap di tengah — ujung bawah ikon tepat di pusat peta.
          <MapPinIcon
            className={cn(
              "pointer-events-none absolute left-1/2 top-1/2 z-[500] size-10 -translate-x-1/2 -translate-y-full text-brand drop-shadow-md",
              !value && "opacity-50",
            )}
          />
        ) : null}
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
            ? `Titik terpasang: ${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}. Geser peta untuk memindahkan.`
            : "Cari alamat, pakai lokasi saya, atau perbesar lalu geser peta sampai pin di titik yang tepat."}
        </span>
      )}
    </div>
  );
}
