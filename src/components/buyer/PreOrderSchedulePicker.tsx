"use client";

import { useEffect, useMemo, useState } from "react";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import type { OperatingHoursRow } from "@/lib/schedule/evaluate";
import {
  listPreOrderDays,
  type PreOrderRange,
  preOrderSlotInstant,
} from "@/lib/schedule/pre-order-slots";
import { formatLongDayKey } from "@/lib/utils/datetime";
import { getStallOperatingHours } from "@/server/products";

/** Kelompok jam di dropdown supaya daftar slot yang panjang mudah dipindai. */
const TIME_GROUPS = [
  { label: "Pagi", fromHour: 0 },
  { label: "Siang", fromHour: 11 },
  { label: "Sore", fromHour: 15 },
  { label: "Malam", fromHour: 18 },
] as const;

function groupSlots(slots: string[]) {
  return TIME_GROUPS.map((group, index) => {
    const toHour = TIME_GROUPS[index + 1]?.fromHour ?? 24;
    return {
      label: group.label,
      slots: slots.filter((slot) => {
        const hour = Number(slot.slice(0, 2));
        return hour >= group.fromHour && hour < toHour;
      }),
    };
  }).filter((group) => group.slots.length > 0);
}

/**
 * Pilihan tanggal + jam ambil/antar Pesanan pre-order, dua dropdown native
 * (di HP tampil sebagai roda pilihan sistem). Tanggal & slot dihitung dari
 * rentang hari Item di Keranjang + Jadwal Operasional Lapak -- logika sama
 * yang dipakai server untuk validasi (lihat pre-order-slots.ts).
 */
export function PreOrderSchedulePicker({
  stallSlug,
  range,
  onChange,
}: {
  stallSlug: string;
  range: PreOrderRange;
  /** Jadwal terpilih (ISO string), atau `null` kalau tanggal/jam belum lengkap. */
  onChange: (scheduledFor: string | null) => void;
}) {
  const [hours, setHours] = useState<OperatingHoursRow[] | null>(null);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  useEffect(() => {
    let cancelled = false;
    getStallOperatingHours(stallSlug).then((result) => {
      if (!cancelled) setHours(result ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [stallSlug]);

  const days = useMemo(
    () => (hours ? listPreOrderDays(hours, range, new Date()) : []),
    [hours, range],
  );
  const activeDay = days.find((d) => d.dayKey === selectedDay) ?? null;
  const timeGroups = activeDay ? groupSlots(activeDay.slots) : [];

  function emit(dayKey: string, time: string) {
    onChange(
      dayKey && time ? preOrderSlotInstant(dayKey, time).toISOString() : null,
    );
  }

  function handleDayChange(dayKey: string) {
    setSelectedDay(dayKey);
    // Jam yang sudah dipilih dipertahankan kalau tersedia juga di tanggal baru.
    const nextSlots = days.find((d) => d.dayKey === dayKey)?.slots ?? [];
    const keptTime = nextSlots.includes(selectedTime) ? selectedTime : "";
    setSelectedTime(keptTime);
    emit(dayKey, keptTime);
  }

  function handleTimeChange(time: string) {
    setSelectedTime(time);
    emit(selectedDay, time);
  }

  if (!hours) {
    return <p className="text-sm text-ink-muted">Memuat jadwal...</p>;
  }
  if (days.length === 0) {
    return (
      <p className="text-sm font-medium text-danger">
        Tidak ada tanggal yang bisa dipilih untuk Item di Keranjang ini.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-[3fr_2fr] gap-3">
      <Field label="Tanggal">
        <Select
          value={selectedDay}
          onChange={(e) => handleDayChange(e.target.value)}
          aria-label="Tanggal"
          required
        >
          <option value="" disabled>
            Pilih tanggal
          </option>
          {days.map((day) => (
            <option key={day.dayKey} value={day.dayKey}>
              {formatLongDayKey(day.dayKey)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Jam">
        <Select
          value={selectedTime}
          onChange={(e) => handleTimeChange(e.target.value)}
          disabled={!activeDay}
          aria-label="Jam"
          required
        >
          <option value="" disabled>
            Pilih jam
          </option>
          {timeGroups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.slots.map((time) => (
                <option key={time} value={time}>
                  {time.replace(":", ".")}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
    </div>
  );
}
