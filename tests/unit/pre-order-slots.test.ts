import { describe, expect, it } from "vitest";
import type { OperatingHoursRow } from "@/lib/schedule/evaluate";
import {
  combinePreOrderRanges,
  isValidPreOrderSlot,
  listPreOrderDays,
  preOrderSlotInstant,
  preOrderSlotsForDay,
} from "@/lib/schedule/pre-order-slots";

// Rabu 30 Sep 2026, 21.00 WIB.
const NOW = new Date("2026-09-30T14:00:00.000Z");

// Senin–Jumat 08.00–10.00 (dayOfWeek 1..5).
const WEEKDAYS: OperatingHoursRow[] = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  openTime: "08:00:00",
  closeTime: "10:00:00",
}));

describe("combinePreOrderRanges", () => {
  it("min = terbesar, max = terkecil", () => {
    expect(
      combinePreOrderRanges([
        { minDays: 1, maxDays: 30 },
        { minDays: 3, maxDays: 14 },
      ]),
    ).toEqual({ minDays: 3, maxDays: 14 });
  });

  it("null kalau tidak ada irisan", () => {
    expect(
      combinePreOrderRanges([
        { minDays: 5, maxDays: 7 },
        { minDays: 1, maxDays: 3 },
      ]),
    ).toBeNull();
  });
});

describe("preOrderSlotsForDay", () => {
  it("slot 30 menit di dalam jadwal, jam tutup tidak ikut", () => {
    // 2026-10-02 = Jumat.
    expect(preOrderSlotsForDay(WEEKDAYS, "2026-10-02")).toEqual([
      "08:00",
      "08:30",
      "09:00",
      "09:30",
    ]);
  });

  it("hari tanpa jadwal = tutup", () => {
    // 2026-10-03 = Sabtu.
    expect(preOrderSlotsForDay(WEEKDAYS, "2026-10-03")).toEqual([]);
  });

  it("jadwal menembus tengah malam dipotong di 24.00", () => {
    const hours = [{ dayOfWeek: 5, openTime: "22:00", closeTime: "02:00" }];
    expect(preOrderSlotsForDay(hours, "2026-10-02")).toEqual([
      "22:00",
      "22:30",
      "23:00",
      "23:30",
    ]);
  });

  it("Lapak tanpa jadwal pakai 07.00–21.00", () => {
    const slots = preOrderSlotsForDay([], "2026-10-03");
    expect(slots[0]).toBe("07:00");
    expect(slots.at(-1)).toBe("20:30");
  });
});

describe("listPreOrderDays", () => {
  it("mulai hari ini + minDays (WIB), lewati hari tutup", () => {
    const days = listPreOrderDays(WEEKDAYS, { minDays: 2, maxDays: 5 }, NOW);
    // 30 Sep + 2 = 2 Okt (Jum), 3–4 Okt libur, 5 Okt (Sen).
    expect(days.map((d) => d.dayKey)).toEqual(["2026-10-02", "2026-10-05"]);
  });

  it("tanggal hari ini dihitung di WIB, bukan UTC", () => {
    // 1 Okt 00.30 WIB = 30 Sep 17.30 UTC.
    const justAfterMidnight = new Date("2026-09-30T17:30:00.000Z");
    const days = listPreOrderDays(
      [],
      { minDays: 1, maxDays: 1 },
      justAfterMidnight,
    );
    expect(days.map((d) => d.dayKey)).toEqual(["2026-10-02"]);
  });
});

describe("isValidPreOrderSlot", () => {
  const range = { minDays: 2, maxDays: 5 };

  it("menerima slot yang ditawarkan", () => {
    const at = preOrderSlotInstant("2026-10-02", "09:30");
    expect(isValidPreOrderSlot(WEEKDAYS, range, NOW, at)).toBe(true);
  });

  it("menolak tanggal terlalu cepat", () => {
    const at = preOrderSlotInstant("2026-10-01", "09:00");
    expect(isValidPreOrderSlot(WEEKDAYS, range, NOW, at)).toBe(false);
  });

  it("menolak tanggal melewati batas maks", () => {
    const at = preOrderSlotInstant("2026-10-06", "09:00");
    expect(isValidPreOrderSlot(WEEKDAYS, range, NOW, at)).toBe(false);
  });

  it("menolak jam di luar slot atau tidak pas kelipatan 30 menit", () => {
    expect(
      isValidPreOrderSlot(
        WEEKDAYS,
        range,
        NOW,
        preOrderSlotInstant("2026-10-02", "10:00"),
      ),
    ).toBe(false);
    expect(
      isValidPreOrderSlot(
        WEEKDAYS,
        range,
        NOW,
        new Date("2026-10-02T02:15:00.000Z"),
      ),
    ).toBe(false);
  });

  it("menolak hari tutup dan tanggal tidak valid", () => {
    expect(
      isValidPreOrderSlot(
        WEEKDAYS,
        range,
        NOW,
        preOrderSlotInstant("2026-10-03", "09:00"),
      ),
    ).toBe(false);
    expect(isValidPreOrderSlot(WEEKDAYS, range, NOW, new Date("x"))).toBe(
      false,
    );
  });
});
