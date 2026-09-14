import { describe, expect, it } from "vitest";
import {
  dayKeyLabel,
  isReportPeriod,
  resolvePeriod,
  wibDayKey,
} from "@/lib/report/period";

describe("wibDayKey", () => {
  it("memakai zona Asia/Jakarta (UTC+7), bukan UTC", () => {
    // 2026-09-09 20:00 UTC = 2026-09-10 03:00 WIB
    expect(wibDayKey(new Date("2026-09-09T20:00:00Z"))).toBe("2026-09-10");
  });
});

describe("resolvePeriod", () => {
  const now = new Date("2026-09-15T10:00:00Z"); // 17.00 WIB

  it("7_hari: 7 kunci tanggal, berakhir di hari ini WIB", () => {
    const resolved = resolvePeriod("7_hari", now);
    expect(resolved.dayKeys).toHaveLength(7);
    expect(resolved.dayKeys[0]).toBe("2026-09-09");
    expect(resolved.dayKeys[6]).toBe("2026-09-15");
  });

  it("hari_ini: 1 kunci = hari ini WIB", () => {
    expect(resolvePeriod("hari_ini", now).dayKeys).toEqual(["2026-09-15"]);
  });

  it("30_hari: 30 kunci", () => {
    expect(resolvePeriod("30_hari", now).dayKeys).toHaveLength(30);
  });

  it("batas atas eksklusif = tengah malam WIB sesudah hari ini", () => {
    const resolved = resolvePeriod("hari_ini", now);
    expect(resolved.end.toISOString()).toBe("2026-09-15T17:00:00.000Z");
    expect(resolved.start.toISOString()).toBe("2026-09-14T17:00:00.000Z");
  });

  it("periode sebelumnya berbatasan langsung & sama panjang", () => {
    const resolved = resolvePeriod("7_hari", now);
    expect(resolved.prevEnd.getTime()).toBe(resolved.start.getTime());
    expect(resolved.start.getTime() - resolved.prevStart.getTime()).toBe(
      resolved.end.getTime() - resolved.start.getTime(),
    );
  });
});

describe("dayKeyLabel", () => {
  it("format ringkas 'Hari d/m'", () => {
    const label = dayKeyLabel("2026-09-09");
    expect(label).toContain(" 9/9");
    expect(label.split(" ")[0]).toHaveLength(3);
  });
});

describe("isReportPeriod", () => {
  it.each(["hari_ini", "7_hari", "30_hari"])("true untuk %s", (value) => {
    expect(isReportPeriod(value)).toBe(true);
  });

  it("false untuk nilai lain", () => {
    expect(isReportPeriod("tahun_ini")).toBe(false);
    expect(isReportPeriod(undefined)).toBe(false);
    expect(isReportPeriod("")).toBe(false);
  });
});
