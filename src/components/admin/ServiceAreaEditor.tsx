"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import type { Coordinates } from "@/lib/utils/geo";

// Leaflet butuh `window` -- wajib dimatikan SSR-nya di Next.js App Router.
const LocationMapPicker = dynamic(
  () =>
    import("@/components/merchant/LocationMapPicker").then(
      (mod) => mod.LocationMapPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-xl bg-brand-tint" />
    ),
  },
);

// `localId` cuma buat React key (bukan dikirim ke server) -- area baru belum
// punya id DB, dan replace-all di server tidak butuh id sama sekali.
export type EditableServiceArea = {
  localId: string;
  name: string;
  center: Coordinates | null;
  radiusKm: string;
};

export function blankServiceArea(): EditableServiceArea {
  return {
    localId: crypto.randomUUID(),
    name: "",
    center: null,
    radiusKm: "2",
  };
}

/** Konversi state editor jadi input siap kirim ke `saveServiceAreas` -- area yang belum punya titik lokasi dibuang (divalidasi di form pembungkus sebelum submit). */
export function toSaveServiceAreasInput(areas: EditableServiceArea[]) {
  return areas
    .filter((area) => area.center != null)
    .map((area) => ({
      name: area.name,
      centerLatitude: (area.center as Coordinates).latitude,
      centerLongitude: (area.center as Coordinates).longitude,
      radiusKm: area.radiusKm.trim() === "" ? 0 : Number(area.radiusKm),
    }));
}

/**
 * Editor daftar Area Lapak -- controlled, tidak fetch/submit sendiri. Dipakai
 * di `/admin/areas` lewat `ServiceAreaManagerForm`.
 */
export function ServiceAreaEditor({
  areas,
  onChange,
}: {
  areas: EditableServiceArea[];
  onChange: (areas: EditableServiceArea[]) => void;
}) {
  function addArea() {
    onChange([...areas, blankServiceArea()]);
  }

  function removeArea(index: number) {
    onChange(areas.filter((_, i) => i !== index));
  }

  function updateArea(index: number, patch: Partial<EditableServiceArea>) {
    onChange(
      areas.map((area, i) => (i === index ? { ...area, ...patch } : area)),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {areas.map((area, index) => (
        <div
          key={area.localId}
          className="flex flex-col gap-2.5 rounded-control border border-line p-3"
        >
          <div className="flex items-center gap-2">
            <Input
              type="text"
              inputSize="sm"
              value={area.name}
              onChange={(e) => updateArea(index, { name: e.target.value })}
              placeholder="Nama area, mis. Baleendah"
              required
              maxLength={100}
            />
            <Button
              type="button"
              variant="dangerOutline"
              size="sm"
              onClick={() => removeArea(index)}
            >
              Hapus Area
            </Button>
          </div>

          <LocationMapPicker
            value={area.center}
            onChange={(center) => updateArea(index, { center })}
            radiusKm={Number(area.radiusKm) || undefined}
          />

          <Field label="Radius (km)">
            <Input
              type="number"
              inputSize="sm"
              inputMode="decimal"
              min="0.1"
              step="0.1"
              value={area.radiusKm}
              onChange={(e) => updateArea(index, { radiusKm: e.target.value })}
              className="w-32"
            />
          </Field>
        </div>
      ))}

      <Button type="button" variant="secondary" size="sm" onClick={addArea}>
        + Tambah Area
      </Button>
    </div>
  );
}
