import { describe, expect, it } from "vitest";
import {
  evaluateSchedule,
  type OperatingHoursRow,
} from "@/lib/schedule/evaluate";

// Minggu referensi tetap: 2023-01-01 = Minggu (dow 0), 01-02 = Senin (dow 1),
// 01-03 = Selasa (dow 2), 01-04 = Rabu (dow 3), 01-08 = Minggu berikutnya.

describe("evaluateSchedule — tanpa jadwal", () => {
  it("selalu buka, tanpa batas segmen", () => {
    const result = evaluateSchedule([], new Date("2023-01-02T10:00:00+07:00"));
    expect(result.isOpenBySchedule).toBe(true);
    expect(result.segmentEnd).toBeNull();
  });
});

describe("evaluateSchedule — jendela sehari (Senin 17:00-22:00)", () => {
  const hours: OperatingHoursRow[] = [
    { dayOfWeek: 1, openTime: "17:00", closeTime: "22:00" },
  ];

  it("buka di dalam jam", () => {
    const now = new Date("2023-01-02T18:00:00+07:00");
    expect(evaluateSchedule(hours, now).isOpenBySchedule).toBe(true);
  });

  it("tutup sebelum jam buka", () => {
    const now = new Date("2023-01-02T10:00:00+07:00");
    expect(evaluateSchedule(hours, now).isOpenBySchedule).toBe(false);
  });

  it("tutup setelah jam tutup", () => {
    const now = new Date("2023-01-02T23:00:00+07:00");
    expect(evaluateSchedule(hours, now).isOpenBySchedule).toBe(false);
  });

  it("tepat di jam buka -> buka (inklusif)", () => {
    const now = new Date("2023-01-02T17:00:00+07:00");
    expect(evaluateSchedule(hours, now).isOpenBySchedule).toBe(true);
  });

  it("tepat di jam tutup -> tutup (eksklusif)", () => {
    const now = new Date("2023-01-02T22:00:00+07:00");
    expect(evaluateSchedule(hours, now).isOpenBySchedule).toBe(false);
  });

  it("tutup di hari lain (Selasa) walau jam sama", () => {
    const now = new Date("2023-01-03T18:00:00+07:00");
    expect(evaluateSchedule(hours, now).isOpenBySchedule).toBe(false);
  });

  it("segmentStart/segmentEnd membingkai jam buka saat ini", () => {
    const now = new Date("2023-01-02T18:00:00+07:00");
    const result = evaluateSchedule(hours, now);
    expect(result.segmentStart.toISOString()).toBe(
      new Date("2023-01-02T17:00:00+07:00").toISOString(),
    );
    expect(result.segmentEnd?.toISOString()).toBe(
      new Date("2023-01-02T22:00:00+07:00").toISOString(),
    );
  });
});

describe("evaluateSchedule — jendela lewat tengah malam (Senin 22:00-02:00)", () => {
  const hours: OperatingHoursRow[] = [
    { dayOfWeek: 1, openTime: "22:00", closeTime: "02:00" },
  ];

  it("buka larut malam di hari yang sama", () => {
    const now = new Date("2023-01-02T23:00:00+07:00");
    expect(evaluateSchedule(hours, now).isOpenBySchedule).toBe(true);
  });

  it("masih buka dini hari besoknya (sisa jendela kemarin)", () => {
    const now = new Date("2023-01-03T01:00:00+07:00");
    expect(evaluateSchedule(hours, now).isOpenBySchedule).toBe(true);
  });

  it("tutup setelah lewat jam 02:00", () => {
    const now = new Date("2023-01-03T03:00:00+07:00");
    expect(evaluateSchedule(hours, now).isOpenBySchedule).toBe(false);
  });

  it("tutup sebelum jam buka 22:00 di hari yang sama", () => {
    const now = new Date("2023-01-02T20:00:00+07:00");
    expect(evaluateSchedule(hours, now).isOpenBySchedule).toBe(false);
  });
});

describe("evaluateSchedule — jadwal jarang (cuma Minggu 10:00-14:00)", () => {
  const hours: OperatingHoursRow[] = [
    { dayOfWeek: 0, openTime: "10:00", closeTime: "14:00" },
  ];

  it("tutup di hari lain, segmentEnd ketemu Minggu berikutnya", () => {
    const now = new Date("2023-01-04T10:00:00+07:00"); // Rabu
    const result = evaluateSchedule(hours, now);
    expect(result.isOpenBySchedule).toBe(false);
    expect(result.segmentStart.toISOString()).toBe(
      new Date("2023-01-01T14:00:00+07:00").toISOString(),
    );
    expect(result.segmentEnd?.toISOString()).toBe(
      new Date("2023-01-08T10:00:00+07:00").toISOString(),
    );
  });

  it("buka pas hari Minggu-nya", () => {
    const now = new Date("2023-01-01T12:00:00+07:00");
    expect(evaluateSchedule(hours, now).isOpenBySchedule).toBe(true);
  });
});
