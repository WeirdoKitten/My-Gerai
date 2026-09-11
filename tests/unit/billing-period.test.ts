import { describe, expect, it } from "vitest";
import { resolveBillingPeriod } from "@/lib/billing/period";

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
