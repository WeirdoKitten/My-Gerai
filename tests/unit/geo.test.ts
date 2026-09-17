import { describe, expect, it } from "vitest";
import {
  findNearestArea,
  formatDistanceKm,
  haversineDistanceKm,
} from "@/lib/utils/geo";

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

describe("findNearestArea", () => {
  const baleendah = {
    id: "area-1",
    centerLatitude: -7.0093,
    centerLongitude: 107.6272,
    radiusKm: 3,
  };
  const dayeuhkolot = {
    id: "area-2",
    centerLatitude: -6.99,
    centerLongitude: 107.62,
    radiusKm: 3,
  };

  it("null kalau tidak ada area yang mencakup titik", () => {
    const jauh = { latitude: -6.2088, longitude: 106.8456 };
    expect(findNearestArea(jauh, [baleendah, dayeuhkolot])).toBeNull();
  });

  it("null kalau daftar area kosong", () => {
    const titik = { latitude: -7.0093, longitude: 107.6272 };
    expect(findNearestArea(titik, [])).toBeNull();
  });

  it("masuk ke satu-satunya area yang mencakup titik", () => {
    const titikDiBaleendah = { latitude: -7.0093, longitude: 107.6272 };
    expect(findNearestArea(titikDiBaleendah, [baleendah])?.id).toBe("area-1");
  });

  it("tumpang tindih -> menang area yang pusatnya paling dekat", () => {
    // Titik persis di pusat Baleendah, dan tetap dalam radius Dayeuhkolot juga.
    const titik = { latitude: -7.0093, longitude: 107.6272 };
    expect(findNearestArea(titik, [dayeuhkolot, baleendah])?.id).toBe("area-1");
  });
});
