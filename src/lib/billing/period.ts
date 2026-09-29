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

/** Batas aman jumlah periode susulan dalam satu run (±2 tahun untuk siklus mingguan). */
export const MAX_CATCH_UP_PERIODS = 104;

/**
 * Semua periode yang SUDAH tertutup, mulai dari periode yang memuat `from`
 * sampai periode terakhir yang tutup sebelum/tepat di `now`, urut lama → baru.
 * Dipakai tagihan susulan: kalau job mingguan telat/terlewat, periode yang
 * bolong tetap ditagih (lihat runWeeklyServiceFeeBilling). Kosong kalau
 * `from` masih di periode yang sedang berjalan. Dibatasi `maxPeriods` terbaru.
 */
export function listClosedBillingPeriods(
  from: Date,
  now: Date,
  cycleDays: number,
  maxPeriods: number = MAX_CATCH_UP_PERIODS,
): BillingPeriod[] {
  const cycleMs = cycleDays * DAY_MS;
  const firstIndex = Math.floor((from.getTime() - BILLING_EPOCH) / cycleMs);
  // Indeks periode tertutup terakhir = indeks akhir dari resolveBillingPeriod.
  const lastEndIndex = Math.floor((now.getTime() - BILLING_EPOCH) / cycleMs);
  const periods: BillingPeriod[] = [];
  for (
    let startIndex = Math.max(firstIndex, lastEndIndex - maxPeriods);
    startIndex < lastEndIndex;
    startIndex++
  ) {
    periods.push({
      periodStart: new Date(BILLING_EPOCH + startIndex * cycleMs),
      periodEnd: new Date(BILLING_EPOCH + (startIndex + 1) * cycleMs),
    });
  }
  return periods;
}

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
