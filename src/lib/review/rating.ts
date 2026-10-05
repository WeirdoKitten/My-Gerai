import type { RatingSummary } from "@/types/review";

/** Rata-rata rating dibulatkan 1 desimal; `null` kalau belum ada ulasan. */
export function toRatingSummary(sum: number, count: number): RatingSummary {
  if (count <= 0) return { average: null, count: 0 };
  return { average: Math.round((sum / count) * 10) / 10, count };
}

/** Format angka rating untuk UI Indonesia (koma desimal), mis. 4.5 -> "4,5", 5 -> "5,0". */
export function formatRating(average: number): string {
  return average.toFixed(1).replace(".", ",");
}

/**
 * Samarkan nama Pembeli untuk ulasan publik: kata pertama utuh + inisial kata
 * kedua ("Budi Santoso Wijaya" -> "Budi S."). Nama di Pesanan bebas diisi
 * Pembeli, jadi jangan tampilkan utuh ke publik.
 */
export function maskBuyerName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Pembeli";
  const first = words[0].slice(0, 20);
  return words.length > 1 ? `${first} ${words[1][0].toUpperCase()}.` : first;
}
