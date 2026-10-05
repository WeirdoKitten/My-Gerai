import { addDayKey, wibDayKey } from "@/lib/report/period";
import type { OperatingHoursRow } from "./evaluate";

/** Jarak antar pilihan jam di checkout pre-order. */
export const PRE_ORDER_SLOT_MINUTES = 30;
/** Jendela jam untuk Lapak yang belum mengisi Jadwal Operasional (dianggap selalu buka). */
const DEFAULT_WINDOW = { openTime: "07:00", closeTime: "21:00" };
const MINUTES_PER_DAY = 24 * 60;

/** Rentang hari pre-order sebuah Item/keranjang, relatif ke tanggal hari ini (WIB). */
export type PreOrderRange = { minDays: number; maxDays: number };

export type PreOrderDay = {
  /** Tanggal WIB "YYYY-MM-DD". */
  dayKey: string;
  /** Jam mulai slot "HH:mm" (WIB), urut naik. */
  slots: string[];
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Gabungan rentang semua Item pre-order di keranjang: tanggal paling cepat
 * mengikuti Item yang paling lama dibuat, tanggal terjauh mengikuti batas
 * paling pendek. `null` kalau tidak ada tanggal yang memenuhi semua Item.
 */
export function combinePreOrderRanges(
  ranges: PreOrderRange[],
): PreOrderRange | null {
  if (ranges.length === 0) return null;
  const minDays = Math.max(...ranges.map((r) => r.minDays));
  const maxDays = Math.min(...ranges.map((r) => r.maxDays));
  return minDays <= maxDays ? { minDays, maxDays } : null;
}

/**
 * Slot jam pada satu tanggal, di dalam Jadwal Operasional hari itu. Jadwal
 * yang menembus tengah malam hanya dipakai sampai 24.00 di tanggal yang
 * sama (sisa lewat tengah malam tidak ditawarkan, supaya "tanggal" yang
 * dipilih Pembeli tidak membingungkan). Hari tanpa jadwal = tutup (`[]`).
 * Lapak tanpa jadwal sama sekali = jendela default 07.00–21.00.
 */
export function preOrderSlotsForDay(
  hours: OperatingHoursRow[],
  dayKey: string,
): string[] {
  let window: { openTime: string; closeTime: string } | undefined;
  if (hours.length === 0) {
    window = DEFAULT_WINDOW;
  } else {
    const dayOfWeek = new Date(`${dayKey}T00:00:00Z`).getUTCDay();
    window = hours.find((h) => h.dayOfWeek === dayOfWeek);
  }
  if (!window) return [];

  const open = toMinutes(window.openTime);
  const closeRaw = toMinutes(window.closeTime);
  const close = closeRaw <= open ? MINUTES_PER_DAY : closeRaw;

  const firstSlot =
    Math.ceil(open / PRE_ORDER_SLOT_MINUTES) * PRE_ORDER_SLOT_MINUTES;
  const slots: string[] = [];
  for (let t = firstSlot; t < close; t += PRE_ORDER_SLOT_MINUTES) {
    slots.push(toTime(t));
  }
  return slots;
}

/** Tanggal-tanggal yang bisa dipilih (dengan slot jamnya), dari hari ini + `minDays` s.d. + `maxDays`. */
export function listPreOrderDays(
  hours: OperatingHoursRow[],
  range: PreOrderRange,
  now: Date,
): PreOrderDay[] {
  const todayKey = wibDayKey(now);
  const days: PreOrderDay[] = [];
  for (let offset = range.minDays; offset <= range.maxDays; offset++) {
    const dayKey = addDayKey(todayKey, offset);
    const slots = preOrderSlotsForDay(hours, dayKey);
    if (slots.length > 0) days.push({ dayKey, slots });
  }
  return days;
}

/** Instant dari tanggal + jam WIB yang dipilih Pembeli. */
export function preOrderSlotInstant(dayKey: string, time: string): Date {
  return new Date(`${dayKey}T${time}:00+07:00`);
}

const wibTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Validasi server: apakah `scheduledFor` tepat jatuh di salah satu slot yang
 * ditawarkan untuk `range` & jadwal Lapak saat ini. Tidak pernah percaya
 * tanggal dari klien.
 */
export function isValidPreOrderSlot(
  hours: OperatingHoursRow[],
  range: PreOrderRange,
  now: Date,
  scheduledFor: Date,
): boolean {
  if (Number.isNaN(scheduledFor.getTime())) return false;
  const dayKey = wibDayKey(scheduledFor);
  const time = wibTimeFormatter.format(scheduledFor);
  const day = listPreOrderDays(hours, range, now).find(
    (d) => d.dayKey === dayKey,
  );
  return (
    !!day &&
    day.slots.includes(time) &&
    preOrderSlotInstant(dayKey, time).getTime() === scheduledFor.getTime()
  );
}
