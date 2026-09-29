import { describe, expect, it } from "vitest";
import {
  listClosedBillingPeriods,
  resolveBillingPeriod,
} from "@/lib/billing/period";

const DAY_MS = 86_400_000;
// Epoch tetap di src/lib/billing/period.ts: 2026-01-05T00:00:00+07:00.
const EPOCH_UTC = new Date("2026-01-04T17:00:00.000Z").getTime();

describe("resolveBillingPeriod", () => {
  it("tepat di epoch: periode tertutup yang berlaku adalah [epoch-cycle, epoch)", () => {
    const { periodStart, periodEnd } = resolveBillingPeriod(
      new Date(EPOCH_UTC),
      7,
    );
    expect(periodEnd.getTime()).toBe(EPOCH_UTC);
    expect(periodStart.getTime()).toBe(EPOCH_UTC - 7 * DAY_MS);
  });

  it("di tengah siklus: tetap kembalikan periode yang SUDAH tertutup, bukan yang sedang berjalan", () => {
    const now = new Date(EPOCH_UTC + 3 * DAY_MS);
    const { periodStart, periodEnd } = resolveBillingPeriod(now, 7);
    expect(periodEnd.getTime()).toBe(EPOCH_UTC);
    expect(periodStart.getTime()).toBe(EPOCH_UTC - 7 * DAY_MS);
    expect(periodEnd.getTime()).toBeLessThanOrEqual(now.getTime());
  });

  it("persis di batas siklus berikutnya: periode yang baru saja tutup ikut terhitung", () => {
    const now = new Date(EPOCH_UTC + 7 * DAY_MS);
    const { periodStart, periodEnd } = resolveBillingPeriod(now, 7);
    expect(periodStart.getTime()).toBe(EPOCH_UTC);
    expect(periodEnd.getTime()).toBe(EPOCH_UTC + 7 * DAY_MS);
  });

  it("1ms setelah batas siklus: masih periode yang sama (belum masuk siklus berikutnya)", () => {
    const now = new Date(EPOCH_UTC + 7 * DAY_MS + 1);
    const { periodStart, periodEnd } = resolveBillingPeriod(now, 7);
    expect(periodStart.getTime()).toBe(EPOCH_UTC);
    expect(periodEnd.getTime()).toBe(EPOCH_UTC + 7 * DAY_MS);
  });

  it("panjang periode selalu persis cycleDays, untuk cycleDays berapa pun", () => {
    for (const cycleDays of [1, 3, 7, 14, 30]) {
      const now = new Date(EPOCH_UTC + 100 * DAY_MS);
      const { periodStart, periodEnd } = resolveBillingPeriod(now, cycleDays);
      expect(periodEnd.getTime() - periodStart.getTime()).toBe(
        cycleDays * DAY_MS,
      );
      expect(periodEnd.getTime()).toBeLessThanOrEqual(now.getTime());
    }
  });
});

describe("listClosedBillingPeriods (tagihan susulan)", () => {
  const WEEK = 7 * DAY_MS;

  it("Pesanan 3 minggu lalu, job baru jalan sekarang: 3 periode tertutup, urut lama ke baru, bersambung", () => {
    const from = new Date(EPOCH_UTC + 2 * DAY_MS); // di periode [epoch, epoch+7)
    const now = new Date(EPOCH_UTC + 3 * WEEK + DAY_MS); // periode ke-4 sedang berjalan
    const periods = listClosedBillingPeriods(from, now, 7);
    expect(periods.map((p) => p.periodStart.getTime())).toEqual([
      EPOCH_UTC,
      EPOCH_UTC + WEEK,
      EPOCH_UTC + 2 * WEEK,
    ]);
    for (const p of periods) {
      expect(p.periodEnd.getTime() - p.periodStart.getTime()).toBe(WEEK);
      expect(p.periodEnd.getTime()).toBeLessThanOrEqual(now.getTime());
    }
  });

  it("periode terakhir = periode yang dikembalikan resolveBillingPeriod", () => {
    const now = new Date(EPOCH_UTC + 5 * WEEK + 3 * DAY_MS);
    const periods = listClosedBillingPeriods(new Date(EPOCH_UTC), now, 7);
    const latest = resolveBillingPeriod(now, 7);
    expect(periods.at(-1)?.periodStart.getTime()).toBe(
      latest.periodStart.getTime(),
    );
    expect(periods.at(-1)?.periodEnd.getTime()).toBe(
      latest.periodEnd.getTime(),
    );
  });

  it("Pesanan di periode yang masih berjalan: belum ada yang ditagih", () => {
    const now = new Date(EPOCH_UTC + 3 * DAY_MS);
    expect(
      listClosedBillingPeriods(new Date(EPOCH_UTC + DAY_MS), now, 7),
    ).toEqual([]);
  });

  it("dibatasi maxPeriods terbaru", () => {
    const now = new Date(EPOCH_UTC + 10 * WEEK + DAY_MS);
    const periods = listClosedBillingPeriods(new Date(EPOCH_UTC), now, 7, 3);
    expect(periods).toHaveLength(3);
    expect(periods[0].periodStart.getTime()).toBe(EPOCH_UTC + 7 * WEEK);
  });
});
