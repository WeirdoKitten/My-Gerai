/**
 * Logika murni penentuan provider peta (tanpa DB, bisa diunit-test). Akses
 * tabel penghitung ada di `usage-store.ts`.
 */

/** SKU Google Maps Platform yang ditagih dan dihitung sendiri. */
export const MAP_SKUS = ["map_load", "autocomplete", "place_details"] as const;
export type MapSku = (typeof MAP_SKUS)[number];

/**
 * Default batas per SKU per bulan — sengaja di bawah kuota gratis bulanan
 * Google (Essentials 10.000/SKU saat ditulis, 2026-10). Cek harga terkini
 * saat setup; atur lewat `GOOGLE_MAPS_MONTHLY_LIMIT`.
 */
const DEFAULT_MONTHLY_LIMIT = 9000;

/** Lama Google dimatikan setelah satu kegagalan sebelum dicoba lagi. */
export const BREAKER_COOLDOWN_MS = 15 * 60 * 1000;

export type GoogleMapsKeys = { browserKey: string; serverKey: string };

/** Key Google kalau mode Google diaktifkan & lengkap, selain itu `null` (= selalu OSM). */
export function getGoogleMapsKeys(
  env: NodeJS.ProcessEnv = process.env,
): GoogleMapsKeys | null {
  if (env.MAPS_PROVIDER !== "google") return null;
  const browserKey = env.GOOGLE_MAPS_BROWSER_KEY?.trim();
  const serverKey = env.GOOGLE_MAPS_SERVER_KEY?.trim();
  if (!browserKey || !serverKey) return null;
  return { browserKey, serverKey };
}

export function getMonthlyLimit(env: NodeJS.ProcessEnv = process.env): number {
  const value = Number(env.GOOGLE_MAPS_MONTHLY_LIMIT);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_MONTHLY_LIMIT;
}

/** Kunci bulan (UTC) untuk penghitung, mis. `2026-10`. */
export function usageMonth(now: Date): string {
  return now.toISOString().slice(0, 7);
}

/** `true` kalau SEMUA SKU masih di bawah batas — satu SKU habis = seluruh picker pindah OSM (peta & pencarian satu paket). */
export function isWithinBudget(
  usage: Partial<Record<MapSku, number>>,
  limit: number,
): boolean {
  return MAP_SKUS.every((sku) => (usage[sku] ?? 0) < limit);
}

// --- Circuit breaker (in-memory per proses, cukup untuk single-instance — sama seperti limiter.ts) ---

let breakerOpenUntil = 0;

/** Matikan Google sementara setelah gagal (kuota habis, key ditolak, timeout). */
export function tripBreaker(now: number = Date.now()): void {
  breakerOpenUntil = now + BREAKER_COOLDOWN_MS;
}

export function isBreakerOpen(now: number = Date.now()): boolean {
  return now < breakerOpenUntil;
}

/** Khusus test. */
export function resetBreaker(): void {
  breakerOpenUntil = 0;
}
