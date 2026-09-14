import { addDayKey, wibDayKey } from "@/lib/report/period";

const WIB_OFFSET = "+07:00";
/** Cukup lebar untuk jadwal yang cuma diisi 1 hari/minggu (siklus 7 hari). */
const SEARCH_DAYS = 8;

/** Satu baris jadwal operasional — `dayOfWeek` konvensi Postgres `EXTRACT(dow)` (0=Minggu..6=Sabtu). */
export type OperatingHoursRow = {
  dayOfWeek: number;
  /** "HH:mm" atau "HH:mm:ss" (hasil kolom `time` Postgres). */
  openTime: string;
  closeTime: string;
};

export type ScheduleEvaluation = {
  isOpenBySchedule: boolean;
  /** Awal segmen buka/tutup yang sedang berlangsung saat ini. */
  segmentStart: Date;
  /** Kapan segmen ini berakhir (batas jadwal berikutnya). `null` = tidak ada jadwal sama sekali. */
  segmentEnd: Date | null;
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function instantAt(dayKey: string, time: string): Date {
  return new Date(`${dayKey}T${time.slice(0, 5)}:00${WIB_OFFSET}`);
}

/** dayOfWeek Postgres (0=Minggu..6=Sabtu) dari sebuah kunci tanggal WIB "YYYY-MM-DD". */
function dayOfWeekOfKey(dayKey: string): number {
  return new Date(`${dayKey}T00:00:00Z`).getUTCDay();
}

/**
 * Instant buka & tutup jadwal hari `dayKey`, kalau ada barisnya. `closeTime
 * <= openTime` dianggap jendela menembus tengah malam — instant tutup jatuh
 * di hari kalender berikutnya.
 */
function windowOnDay(
  hours: OperatingHoursRow[],
  dayKey: string,
): { open: Date; close: Date } | null {
  const row = hours.find((h) => h.dayOfWeek === dayOfWeekOfKey(dayKey));
  if (!row) return null;

  const open = instantAt(dayKey, row.openTime);
  const overnight = toMinutes(row.closeTime) <= toMinutes(row.openTime);
  const close = overnight
    ? instantAt(addDayKey(dayKey, 1), row.closeTime)
    : instantAt(dayKey, row.closeTime);
  return { open, close };
}

/** Apakah `now` ada di jendela buka hari ini, atau sisa jendela kemarin yang menembus tengah malam. */
function isOpenAt(hours: OperatingHoursRow[], now: Date): boolean {
  const todayKey = wibDayKey(now);

  const today = windowOnDay(hours, todayKey);
  if (today && now >= today.open && now < today.close) return true;

  const yesterday = windowOnDay(hours, addDayKey(todayKey, -1));
  if (yesterday && now >= yesterday.open && now < yesterday.close) return true;

  return false;
}

/**
 * Evaluasi jadwal operasional pada satu instant. Tanpa jadwal sama sekali
 * (`hours` kosong) = selalu buka (default aman, tidak meregresi Lapak lama
 * yang belum pernah isi jadwal), dan tidak ada batas untuk direset — override
 * manual di atasnya berlaku terus sampai diubah lagi.
 */
export function evaluateSchedule(
  hours: OperatingHoursRow[],
  now: Date,
): ScheduleEvaluation {
  if (hours.length === 0) {
    return {
      isOpenBySchedule: true,
      segmentStart: new Date(0),
      segmentEnd: null,
    };
  }

  const todayKey = wibDayKey(now);
  const candidates: Date[] = [];
  for (let offset = -SEARCH_DAYS; offset <= SEARCH_DAYS; offset++) {
    const window = windowOnDay(hours, addDayKey(todayKey, offset));
    if (window) candidates.push(window.open, window.close);
  }
  candidates.sort((a, b) => a.getTime() - b.getTime());

  let segmentStart = new Date(0);
  let segmentEnd: Date | null = null;
  for (const candidate of candidates) {
    if (candidate.getTime() <= now.getTime()) {
      segmentStart = candidate;
    } else if (segmentEnd === null) {
      segmentEnd = candidate;
    }
  }

  return { isOpenBySchedule: isOpenAt(hours, now), segmentStart, segmentEnd };
}
