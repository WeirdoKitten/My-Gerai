import { timingSafeEqual } from "node:crypto";

/**
 * Verifikasi header `Authorization: Bearer $CRON_SECRET` untuk Route Handler
 * `src/app/api/cron/*` (dipanggil Scheduled Job Dokploy, bukan lewat sesi
 * cookie). `timingSafeEqual` mencegah timing attack menebak secret — pola
 * sama seperti `safeEqualHex` di `src/lib/payment/midtrans-provider.ts`.
 */
export function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  return timingSafeEqual(
    Buffer.from(header, "utf8"),
    Buffer.from(expected, "utf8"),
  );
}
