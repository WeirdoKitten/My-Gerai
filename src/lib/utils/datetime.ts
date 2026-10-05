// Waktu Indonesia Barat dipatok eksplisit supaya timestamp yang dirender di
// server (kontainer biasanya UTC) tetap tampil sebagai jam lokal Pedagang.
const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

/** Tanggal + jam ringkas untuk tampilan, mis. "9 Sep 2026, 14.30" (WIB). */
export function formatDateTime(value: Date): string {
  return dateTimeFormatter.format(value);
}

const scheduleFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

/** Jadwal ambil/antar pre-order, mis. "Sabtu, 3 Okt 2026, 10.00" (WIB). */
export function formatSchedule(value: Date): string {
  return scheduleFormatter.format(value);
}

const shortDayFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Jakarta",
});

/** "2026-10-03" (tanggal WIB) -> "Sab, 3 Okt" (judul grup tanggal pre-order di dashboard). */
export function formatShortDayKey(dayKey: string): string {
  return shortDayFormatter.format(new Date(`${dayKey}T12:00:00+07:00`));
}

const longDayFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Asia/Jakarta",
});

/** "2026-10-03" (tanggal WIB) -> "Sabtu, 3 Oktober" (dropdown tanggal pre-order). */
export function formatLongDayKey(dayKey: string): string {
  return longDayFormatter.format(new Date(`${dayKey}T12:00:00+07:00`));
}
