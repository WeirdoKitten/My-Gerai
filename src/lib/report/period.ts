import type { ReportPeriod } from "@/types/report";

const WIB_OFFSET = "+07:00";
const DAY_MS = 86_400_000;

const PERIOD_DAYS: Record<ReportPeriod, number> = {
  hari_ini: 1,
  "7_hari": 7,
  "30_hari": 30,
};

export const REPORT_PERIODS: readonly ReportPeriod[] = [
  "hari_ini",
  "7_hari",
  "30_hari",
];

export const REPORT_PERIOD_LABEL: Record<ReportPeriod, string> = {
  hari_ini: "Hari ini",
  "7_hari": "7 hari",
  "30_hari": "30 hari",
};

export function isReportPeriod(value: unknown): value is ReportPeriod {
  return value === "hari_ini" || value === "7_hari" || value === "30_hari";
}

/** Tanggal lokal Asia/Jakarta ("YYYY-MM-DD") untuk sebuah instant. */
export function wibDayKey(instant: Date): string {
  // en-CA memformat sebagai ISO "YYYY-MM-DD".
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

function wibMidnight(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00${WIB_OFFSET}`);
}

/** Geser sebuah "YYYY-MM-DD" sebanyak `delta` hari (aritmetika di UTC, tanpa DST). */
function addDayKey(dayKey: string, delta: number): string {
  const base = new Date(`${dayKey}T00:00:00Z`);
  return new Date(base.getTime() + delta * DAY_MS).toISOString().slice(0, 10);
}

export type ResolvedPeriod = {
  days: number;
  /** Instant awal periode (inklusif). */
  start: Date;
  /** Instant akhir periode (eksklusif) = tengah malam WIB sesudah hari ini. */
  end: Date;
  /** Periode sebelumnya yang sama panjang — untuk delta. */
  prevStart: Date;
  prevEnd: Date;
  /** Kunci tanggal WIB urut lama → baru, panjang = `days`. */
  dayKeys: string[];
};

export function resolvePeriod(period: ReportPeriod, now: Date): ResolvedPeriod {
  const days = PERIOD_DAYS[period];
  const todayKey = wibDayKey(now);
  const endKey = addDayKey(todayKey, 1);
  const startKey = addDayKey(endKey, -days);

  return {
    days,
    start: wibMidnight(startKey),
    end: wibMidnight(endKey),
    prevStart: wibMidnight(addDayKey(startKey, -days)),
    prevEnd: wibMidnight(startKey),
    dayKeys: Array.from({ length: days }, (_, i) => addDayKey(startKey, i)),
  };
}

/** Instant `n` hari sebelum `now` — untuk jendela analisis asisten yang tetap. */
export function daysAgo(now: Date, n: number): Date {
  return new Date(now.getTime() - n * DAY_MS);
}

const weekdayFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  weekday: "short",
});

/** "2026-09-09" → "Rab 9/9" (label ringkas bar penjualan harian). */
export function dayKeyLabel(dayKey: string): string {
  const [, month, day] = dayKey.split("-");
  const weekday = weekdayFmt.format(
    new Date(`${dayKey}T12:00:00${WIB_OFFSET}`),
  );
  return `${weekday} ${Number(day)}/${Number(month)}`;
}
