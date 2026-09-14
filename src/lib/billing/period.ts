const DAY_MS = 86_400_000;

/**
 * Titik jangkar tetap untuk aritmetika periode tagihan — sembarang, cuma
 * perlu konsisten sepanjang waktu (bukan disetel ulang tiap deploy). Pola
 * epoch-relative (bukan alignment kalender/hari-dalam-minggu) supaya tetap
 * benar untuk `cycleDays` berapa pun (siklus mingguan bisa diubah Admin lewat
 * `platform_config`, lihat src/server/config.ts).
 */
const BILLING_EPOCH = new Date("2026-01-05T00:00:00+07:00").getTime();

export type BillingPeriod = {
  /** Instant awal periode (inklusif). */
  periodStart: Date;
  /** Instant akhir periode (eksklusif) — juga jadi `dueAt` tagihan (lihat DATA-MODEL.md). */
  periodEnd: Date;
};

/** Periode tagihan yang sedang berjalan/baru tutup relatif terhadap `now`. */
export function resolveBillingPeriod(
  now: Date,
  cycleDays: number,
): BillingPeriod {
  const cycleMs = cycleDays * DAY_MS;
  const index = Math.floor((now.getTime() - BILLING_EPOCH) / cycleMs);
  const periodEnd = new Date(BILLING_EPOCH + index * cycleMs);
  const periodStart = new Date(periodEnd.getTime() - cycleMs);
  return { periodStart, periodEnd };
}
