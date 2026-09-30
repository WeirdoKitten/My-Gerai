"use client";

import type L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/Button";
import { XIcon } from "@/components/ui/icons";
import type { Coordinates } from "@/lib/utils/geo";
import { reverseGeocodeAddress } from "@/server/geocoding";
import { AddressAutocomplete } from "./AddressAutocomplete";

const INDONESIA_CENTER: [number, number] = [-2.5, 118];
const DEFAULT_ZOOM = 4;
const PICKED_ZOOM = 16;
const REVERSE_GEOCODE_DEBOUNCE_MS = 600;
/** ~1 m -- selisih lebih kecil dianggap titik yang sama (pembulatan piksel setelah flyTo). */
const SAME_POINT_EPSILON = 1e-5;

function isSamePoint(a: Coordinates, b: Coordinates): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < SAME_POINT_EPSILON &&
    Math.abs(a.longitude - b.longitude) < SAME_POINT_EPSILON
  );
}

function toCoordinates(latLng: L.LatLng): Coordinates {
  return { latitude: latLng.lat, longitude: latLng.lng };
}

/**
 * Pin selalu di tengah peta (gaya aplikasi ojol) -- yang digeser petanya,
 * bukan pin-nya, jauh lebih mudah di layar HP daripada menyeret pin kecil.
 * Titik baru dicatat saat peta berhenti bergerak (`moveend`). Selama titik
 * belum pernah dipilih (`value` null), menggeser peta TIDAK otomatis
 * memilih titik -- Pembeli harus tap "Pilih titik ini" / tap peta / cari
 * alamat, supaya titik awal (mis. lokasi Lapak di checkout) tidak diam-diam
 * terpakai sebagai alamat antar.
 */
function MapController({
  value,
  onCommit,
  onLiveMove,
  onReady,
}: {
  value: Coordinates | null;
  onCommit: (coords: Coordinates) => void;
  /** Opsional -- posisi tengah selama peta digeser (lingkaran radius ikut bergerak mulus). */
  onLiveMove?: (coords: Coordinates) => void;
  onReady: (map: L.Map) => void;
}) {
  const map = useMapEvents({
    move() {
      onLiveMove?.(toCoordinates(map.getCenter()));
    },
    moveend() {
      const center = toCoordinates(map.getCenter());
      if (value && !isSamePoint(center, value)) onCommit(center);
    },
    click(e) {
      if (value) {
        map.panTo(e.latlng);
      } else {
        onCommit(toCoordinates(e.latlng));
        map.setView(e.latlng, Math.max(map.getZoom(), PICKED_ZOOM));
      }
    },
  });

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  return null;
}

export function LocationMapPicker({
  value,
  onChange,
  onAddressResolved,
  radiusKm,
  initialCenter,
}: {
  value: Coordinates | null;
  onChange: (coords: Coordinates | null) => void;
  /** Opsional -- dipanggil dengan teks alamat hasil reverse-geocode setiap kali titik diubah pengguna (dipakai auto-isi "Alamat Lapak"). */
  onAddressResolved?: (address: string) => void;
  /** Opsional -- kalau diisi, gambar lingkaran radius (km) di sekitar titik (dipakai Admin memilih cakupan Area Lapak). */
  radiusKm?: number;
  /** Opsional -- titik awal peta saat `value` masih kosong (mis. lokasi Lapak di checkout Pesanan Antar). */
  initialCenter?: Coordinates;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [liveCenter, setLiveCenter] = useState<Coordinates | null>(value);
  const [addressLabel, setAddressLabel] = useState<string | null>(null);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  // True kalau perubahan `value` terakhir berasal dari aksi pengguna di
  // picker ini -- hanya itu yang boleh menimpa alamat lewat `onAddressResolved`
  // (bukan titik lama yang dimuat saat halaman dibuka).
  const userChangedRef = useRef(false);
  const onAddressResolvedRef = useRef(onAddressResolved);
  onAddressResolvedRef.current = onAddressResolved;
  const valueRef = useRef(value);
  valueRef.current = value;

  const handleReady = useCallback((map: L.Map) => {
    mapRef.current = map;
  }, []);

  const commit = useCallback(
    (coords: Coordinates) => {
      userChangedRef.current = true;
      setGeoError(null);
      onChange(coords);
    },
    [onChange],
  );

  const commitAndFly = useCallback(
    (coords: Coordinates) => {
      commit(coords);
      mapRef.current?.flyTo([coords.latitude, coords.longitude], PICKED_ZOOM);
    },
    [commit],
  );

  // Label "Pin di: ..." -- reverse-geocode setelah pin berhenti sejenak.
  useEffect(() => {
    if (!value) {
      setAddressLabel(null);
      setResolvingAddress(false);
      return;
    }
    const fromUser = userChangedRef.current;
    userChangedRef.current = false;
    setResolvingAddress(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      const address = await reverseGeocodeAddress(
        value.latitude,
        value.longitude,
      );
      if (cancelled) return;
      setResolvingAddress(false);
      setAddressLabel(address);
      if (address && fromUser) onAddressResolvedRef.current?.(address);
    }, REVERSE_GEOCODE_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  // Layar penuh: kunci scroll halaman, Esc untuk keluar, dan beri tahu
  // Leaflet ukuran kontainer berubah (tanpa ini tile hanya terisi sebagian).
  useEffect(() => {
    const map = mapRef.current;
    // Kembalikan tengah peta tepat ke titik terpilih -- tanpa ini pergeseran
    // setengah piksel saat resize tercatat sebagai titik baru.
    const frame = requestAnimationFrame(() => {
      if (!map) return;
      const center = valueRef.current;
      map.invalidateSize({ pan: false });
      if (center) {
        map.setView([center.latitude, center.longitude], map.getZoom(), {
          animate: false,
        });
      }
    });
    if (!expanded) {
      map?.scrollWheelZoom.disable();
      return () => cancelAnimationFrame(frame);
    }
    map?.scrollWheelZoom.enable();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [expanded]);

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Perangkat/browser ini tidak mendukung deteksi lokasi.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        commitAndFly({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        setGeoError(
          "Tidak bisa mendapat lokasi otomatis. Cari alamat atau geser peta untuk pasang titik manual.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [commitAndFly]);

  function handlePickCenter() {
    const map = mapRef.current;
    if (map) commit(toCoordinates(map.getCenter()));
  }

  const circleCenter = liveCenter ?? value;
  const startCenter = value ?? initialCenter;

  return (
    <div
      className={
        expanded
          ? "fixed inset-0 z-[1100] flex flex-col gap-2 bg-bg p-4"
          : "flex flex-col gap-2"
      }
    >
      {expanded ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-semibold text-ink">
            Pilih titik lokasi
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(false)}
            aria-label="Tutup peta layar penuh"
          >
            <XIcon className="size-5" />
          </Button>
        </div>
      ) : null}
      <AddressAutocomplete
        near={value ?? initialCenter}
        onPick={commitAndFly}
      />
      <div
        className={
          expanded
            ? "relative min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-line"
            : "relative h-64 w-full overflow-hidden rounded-xl border border-line"
        }
      >
        <MapContainer
          center={
            startCenter
              ? [startCenter.latitude, startCenter.longitude]
              : INDONESIA_CENTER
          }
          zoom={startCenter ? PICKED_ZOOM : DEFAULT_ZOOM}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Search by <a href="https://locationiq.com/">LocationIQ.com</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController
            value={value}
            onCommit={commit}
            onLiveMove={radiusKm ? setLiveCenter : undefined}
            onReady={handleReady}
          />
          {circleCenter && value && radiusKm ? (
            <Circle
              center={[circleCenter.latitude, circleCenter.longitude]}
              radius={radiusKm * 1000}
              pathOptions={{ color: "#ea580c", fillOpacity: 0.12 }}
            />
          ) : null}
        </MapContainer>
        {/* Pin tengah -- overlay DOM di luar Leaflet, jadi tidak ikut
            tergeser; ujung bawah ikon tepat di titik tengah peta. */}
        {/* biome-ignore lint/performance/noImgElement: ikon marker statis dari public/leaflet, bukan konten gambar */}
        <img
          src="/leaflet/marker-icon.png"
          alt=""
          width={25}
          height={41}
          className={`pointer-events-none absolute top-1/2 left-1/2 z-[450] -translate-x-1/2 -translate-y-full ${value ? "" : "opacity-50"}`}
        />
        {value ? null : (
          <div className="absolute bottom-3 left-1/2 z-[500] -translate-x-1/2">
            <Button type="button" size="sm" onClick={handlePickCenter}>
              Pilih titik ini
            </Button>
          </div>
        )}
        {expanded ? null : (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="absolute top-2.5 right-2.5 z-[500] rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink shadow-sm hover:bg-bg"
          >
            Layar penuh
          </button>
        )}
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
        {expanded ? (
          <Button
            type="button"
            size="sm"
            className="ml-auto"
            onClick={() => setExpanded(false)}
          >
            Selesai
          </Button>
        ) : null}
      </div>
      {geoError ? (
        <span className="text-xs font-medium text-danger">{geoError}</span>
      ) : value ? (
        <span className="text-xs text-ink-muted">
          <span className="font-semibold text-ink">Pin di: </span>
          {resolvingAddress
            ? "Mencari nama alamat..."
            : (addressLabel ??
              `${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`)}
        </span>
      ) : (
        <span className="text-xs text-ink-muted">
          Cari alamat, atau geser peta sampai pin tepat di lokasi lalu tap
          "Pilih titik ini".
        </span>
      )}
    </div>
  );
}
