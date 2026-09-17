import { describe, expect, it } from "vitest";
import { formatDistanceKm, haversineDistanceKm } from "@/lib/utils/geo";

describe("haversineDistanceKm", () => {
  it("titik yang sama berjarak 0", () => {
    const jakarta = { latitude: -6.2088, longitude: 106.8456 };
    expect(haversineDistanceKm(jakarta, jakarta)).toBe(0);
  });

  it("Jakarta ke Bandung sekitar 115 km", () => {
    const jakarta = { latitude: -6.2088, longitude: 106.8456 };
    const bandung = { latitude: -6.9175, longitude: 107.6191 };
    expect(haversineDistanceKm(jakarta, bandung)).toBeCloseTo(115, -1);
  });
});

describe("formatDistanceKm", () => {
  it("memformat jarak di bawah 1 km sebagai meter", () => {
    expect(formatDistanceKm(0.35)).toBe("350 m");
  });

  it("memformat jarak 1 km ke atas sebagai km", () => {
    expect(formatDistanceKm(1.2)).toBe("1,2 km");
  });
});
