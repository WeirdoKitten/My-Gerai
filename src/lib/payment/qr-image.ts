import QRCode from "qrcode";
import { createTtlCache } from "@/lib/cache/memory";

/**
 * Render payload QRIS (`qr_string` EMV / payload mock) jadi PNG data URI,
 * di-cache per payload. Render memakan 24–44 ms CPU dan memblokir event loop;
 * tanpa cache, setiap buka/refresh halaman status merender ulang
 * (docs/STRESS-TEST.md P0-3). TTL 20 menit > masa berlaku QRIS (15 menit
 * default), ±4 KB per entri → maks ±8 MB.
 */
const qrImageCache = createTtlCache<string, string>({
  ttlMs: 20 * 60_000,
  maxEntries: 2000,
});

export function qrDataUrl(payload: string): Promise<string> {
  return qrImageCache.get(payload, () => QRCode.toDataURL(payload));
}
