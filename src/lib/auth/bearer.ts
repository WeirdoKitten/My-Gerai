export const MOBILE_SESSION_DURATION_MS = 90 * 24 * 60 * 60 * 1000; // 90 hari
/** Sesi mobile diperpanjang hanya kalau sisa umurnya di bawah ini, supaya tidak UPDATE di setiap request. */
const MOBILE_SESSION_RENEW_BELOW_MS = 60 * 24 * 60 * 60 * 1000; // 60 hari

/** Ambil token dari header `Authorization: Bearer <token>`. `null` kalau tidak ada atau formatnya salah. */
export function parseBearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+([A-Za-z0-9_-]{20,200})$/.exec(header.trim());
  return match ? match[1] : null;
}

/** Kedaluwarsa baru untuk sesi mobile yang masih dipakai, atau `null` kalau belum perlu diperpanjang. */
export function renewedMobileExpiry(expiresAt: Date, now: Date): Date | null {
  if (expiresAt.getTime() - now.getTime() >= MOBILE_SESSION_RENEW_BELOW_MS) {
    return null;
  }
  return new Date(now.getTime() + MOBILE_SESSION_DURATION_MS);
}
