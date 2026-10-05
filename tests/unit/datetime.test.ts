import { describe, expect, it } from "vitest";
import {
  formatDateTime,
  formatSchedule,
  formatShortDayKey,
} from "@/lib/utils/datetime";

describe("formatDateTime", () => {
  it("memformat sebagai tanggal + jam ringkas dalam WIB", () => {
    // 2026-09-09T07:30:00Z = 14.30 WIB (UTC+7).
    const value = new Date("2026-09-09T07:30:00.000Z");
    expect(formatDateTime(value)).toBe("9 Sep 2026, 14.30");
  });

  it("dipatok ke Asia/Jakarta, bukan timezone runtime", () => {
    // Tengah malam UTC → masih hari yang sama pukul 07.00 WIB.
    const value = new Date("2026-01-01T00:00:00.000Z");
    expect(formatDateTime(value)).toBe("1 Jan 2026, 07.00");
  });
});

describe("formatSchedule & formatShortDayKey", () => {
  it("memformat jadwal pre-order dalam WIB", () => {
    // 03.00 UTC = 10.00 WIB.
    expect(formatSchedule(new Date("2026-10-03T03:00:00.000Z"))).toBe(
      "Sabtu, 3 Okt 2026, 10.00",
    );
    expect(formatShortDayKey("2026-10-03")).toBe("Sab, 3 Okt");
  });
});
