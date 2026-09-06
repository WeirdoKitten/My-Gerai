import { headers } from "next/headers";

/** Pesan generik dipakai login/registrasi — tidak membocorkan apakah batas per-IP atau per-akun. */
export const RATE_LIMIT_MESSAGE =
  "Terlalu banyak percobaan. Silakan coba lagi dalam beberapa menit.";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Fixed-window rate limiter in-memory. State per-proses (tidak sinkron
 * lintas instance), diterima karena deployment saat ini single-instance
 * (lihat docs/TEKNOLOGI.md §Autentikasi). Bucket kedaluwarsa tidak
 * di-cleanup aktif — cukup ditimpa saat diakses ulang (pola sama dengan
 * lazy-check kedaluwarsa Pesanan/sesi login), aman di skala pedagang kaki lima.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

/**
 * IP klien di produksi (Cloudflare Tunnel + Dokploy, lihat
 * docs/ARSITEKTUR-SISTEM.md). Prioritas `cf-connecting-ip` — header ini
 * SELALU ditimpa Cloudflare di edge dengan IP asli, tidak bisa dipalsukan
 * klien (beda dengan `x-forwarded-for`, yang di-APPEND bukan diganti, jadi
 * segmen pertamanya bisa disisipi klien untuk melompati rate-limit per-IP).
 * `x-forwarded-for` dipakai sebagai fallback (ambil segmen TERAKHIR, yang
 * ditambahkan proxy tepercaya, bukan segmen pertama yang bisa dipalsukan) —
 * untuk kasus tanpa Cloudflare di depan (dev lokal). Fallback konstan
 * terakhir untuk dev lokal tanpa proxy sama sekali.
 */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();

  const cfConnectingIp = headerList.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  const forwardedFor = headerList.get("x-forwarded-for");
  const segments = forwardedFor
    ?.split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments && segments.length > 0) return segments[segments.length - 1];

  return "local-dev";
}
