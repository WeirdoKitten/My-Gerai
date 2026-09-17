"use client";

import { useState } from "react";
import {
  type EditableServiceArea,
  ServiceAreaEditor,
  toSaveServiceAreasInput,
} from "@/components/admin/ServiceAreaEditor";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { saveServiceAreas } from "@/server/service-areas";
import type { ServiceAreaView } from "@/types/service-area";

function toEditableAreas(areas: ServiceAreaView[]): EditableServiceArea[] {
  return areas.map((area) => ({
    localId: crypto.randomUUID(),
    name: area.name,
    center: { latitude: area.centerLatitude, longitude: area.centerLongitude },
    radiusKm: String(area.radiusKm),
  }));
}

export function ServiceAreaManagerForm({
  initialAreas,
}: {
  initialAreas: ServiceAreaView[];
}) {
  const [areas, setAreas] = useState<EditableServiceArea[]>(() =>
    toEditableAreas(initialAreas),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(next: EditableServiceArea[]) {
    setAreas(next);
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const missingCenter = areas.some((area) => area.center == null);
    if (missingCenter) {
      setError(
        "Semua area harus punya titik lokasi -- klik peta untuk pasang titik pusatnya.",
      );
      return;
    }

    setSubmitting(true);
    const result = await saveServiceAreas(toSaveServiceAreasInput(areas));
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message ?? "Gagal menyimpan area.");
      return;
    }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ServiceAreaEditor areas={areas} onChange={handleChange} />
      {error ? <Alert tone="error">{error}</Alert> : null}
      {saved ? <Alert tone="success">Area tersimpan.</Alert> : null}
      <Button type="submit" loading={submitting}>
        {submitting ? "Menyimpan..." : "Simpan Semua Area"}
      </Button>
    </form>
  );
}
