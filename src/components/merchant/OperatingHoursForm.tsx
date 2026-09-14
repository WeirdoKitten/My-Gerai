"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { setMerchantOperatingHours } from "@/server/merchants";
import type { OperatingHoursRow } from "@/types/merchant";

// Indeks array ini = dayOfWeek konvensi Postgres (0=Minggu..6=Sabtu) — JANGAN
// diurutkan ulang, dipakai langsung sebagai indeks `entries` di bawah.
const DAY_LABELS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

// Urutan tampilan saja (Senin di atas, Minggu di bawah) — nilainya tetap
// dayOfWeek asli, cuma urutan render-nya yang beda dari DAY_LABELS di atas.
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

type DayEntry = { enabled: boolean; openTime: string; closeTime: string };

function buildInitialEntries(hours: OperatingHoursRow[]): DayEntry[] {
  const byDay = new Map(hours.map((h) => [h.dayOfWeek, h]));
  return DAY_LABELS.map((_, dayOfWeek) => {
    const row = byDay.get(dayOfWeek);
    return row
      ? { enabled: true, openTime: row.openTime, closeTime: row.closeTime }
      : { enabled: false, openTime: "09:00", closeTime: "17:00" };
  });
}

export function OperatingHoursForm({
  initialHours,
}: {
  initialHours: OperatingHoursRow[];
}) {
  const [entries, setEntries] = useState<DayEntry[]>(() =>
    buildInitialEntries(initialHours),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function updateEntry(dayOfWeek: number, patch: Partial<DayEntry>) {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === dayOfWeek ? { ...entry, ...patch } : entry,
      ),
    );
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const rows: OperatingHoursRow[] = entries
      .map((entry, dayOfWeek) => ({ dayOfWeek, ...entry }))
      .filter((entry) => entry.enabled)
      .map(({ dayOfWeek, openTime, closeTime }) => ({
        dayOfWeek,
        openTime,
        closeTime,
      }));

    const result = await setMerchantOperatingHours(rows);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message ?? "Gagal menyimpan jadwal.");
      return;
    }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card className="flex flex-col divide-y divide-line">
        {DISPLAY_ORDER.map((dayOfWeek) => {
          const label = DAY_LABELS[dayOfWeek];
          const entry = entries[dayOfWeek];
          return (
            <div
              key={label}
              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3"
            >
              <div className="flex items-center gap-2 sm:w-32 sm:shrink-0">
                <Toggle
                  checked={entry.enabled}
                  onChange={(next) => updateEntry(dayOfWeek, { enabled: next })}
                  label={`Buka hari ${label}`}
                />
                <span className="text-sm font-semibold text-ink">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  inputSize="sm"
                  value={entry.openTime}
                  disabled={!entry.enabled}
                  onChange={(e) =>
                    updateEntry(dayOfWeek, { openTime: e.target.value })
                  }
                  className="w-28"
                />
                <span className="text-sm text-ink-muted">–</span>
                <Input
                  type="time"
                  inputSize="sm"
                  value={entry.closeTime}
                  disabled={!entry.enabled}
                  onChange={(e) =>
                    updateEntry(dayOfWeek, { closeTime: e.target.value })
                  }
                  className="w-28"
                />
              </div>
            </div>
          );
        })}
      </Card>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {saved ? (
        <Alert tone="success">Jadwal operasional disimpan.</Alert>
      ) : null}

      <Button type="submit" loading={submitting}>
        {submitting ? "Menyimpan..." : "Simpan Jadwal"}
      </Button>
    </form>
  );
}
