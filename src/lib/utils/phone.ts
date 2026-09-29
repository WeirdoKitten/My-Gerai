/**
 * Normalisasi nomor HP Indonesia ke format `62xxxxxxxxxx` (tanpa `+`) — format
 * yang langsung dipakai link `wa.me/<nomor>` dan untuk mencocokkan nomor di
 * halaman Lacak Pesanan. Menerima `08...`, `62...`, `+62...`, dan `8...`, boleh
 * berisi spasi/strip/titik. `null` kalau bukan nomor seluler Indonesia yang
 * masuk akal (awalan 8, 9–13 digit setelah kode negara).
 */
export function normalizeIndonesianPhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-.()]/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return null;

  let local: string;
  if (digits.startsWith("62")) local = digits.slice(2);
  else if (digits.startsWith("0")) local = digits.slice(1);
  else local = digits;

  if (!/^8\d{8,12}$/.test(local)) return null;
  return `62${local}`;
}

/** Tampilan ramah untuk nomor ternormalisasi: `6281234567890` -> `0812-3456-7890`. */
export function formatIndonesianPhone(normalized: string): string {
  const local = `0${normalized.replace(/^62/, "")}`;
  return local.replace(/^(\d{4})(\d{4})(\d+)$/, "$1-$2-$3");
}
