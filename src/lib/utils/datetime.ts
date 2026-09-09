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
