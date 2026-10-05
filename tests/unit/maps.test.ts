import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GooglePlacesError,
  googleAutocomplete,
  mapAutocompleteResponse,
} from "@/lib/maps/google-places";
import { mapPhotonFeatures, searchPhoton } from "@/lib/maps/photon";
import {
  BREAKER_COOLDOWN_MS,
  getGoogleMapsKeys,
  getMonthlyLimit,
  isBreakerOpen,
  isWithinBudget,
  resetBreaker,
  tripBreaker,
  usageMonth,
} from "@/lib/maps/usage";
import { searchPlacesSchema } from "@/lib/validation/maps.schema";

const GOOGLE_ENV = {
  MAPS_PROVIDER: "google",
  GOOGLE_MAPS_BROWSER_KEY: "browser-key",
  GOOGLE_MAPS_SERVER_KEY: "server-key",
} as unknown as NodeJS.ProcessEnv;

afterEach(() => {
  vi.unstubAllGlobals();
  resetBreaker();
});

describe("getGoogleMapsKeys", () => {
  it("default (env kosong) → null, artinya OSM", () => {
    expect(getGoogleMapsKeys({} as NodeJS.ProcessEnv)).toBeNull();
  });

  it("MAPS_PROVIDER=google tapi key belum lengkap → null", () => {
    expect(
      getGoogleMapsKeys({
        ...GOOGLE_ENV,
        GOOGLE_MAPS_SERVER_KEY: " ",
      }),
    ).toBeNull();
  });

  it("MAPS_PROVIDER=osm walau key terisi → null", () => {
    expect(
      getGoogleMapsKeys({ ...GOOGLE_ENV, MAPS_PROVIDER: "osm" }),
    ).toBeNull();
  });

  it("lengkap → kedua key", () => {
    expect(getGoogleMapsKeys(GOOGLE_ENV)).toEqual({
      browserKey: "browser-key",
      serverKey: "server-key",
    });
  });
});

describe("batas bulanan", () => {
  it("default 9000, bisa diatur lewat env, nilai rusak → default", () => {
    expect(getMonthlyLimit({} as NodeJS.ProcessEnv)).toBe(9000);
    expect(
      getMonthlyLimit({
        GOOGLE_MAPS_MONTHLY_LIMIT: "500",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe(500);
    expect(
      getMonthlyLimit({
        GOOGLE_MAPS_MONTHLY_LIMIT: "-1",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe(9000);
  });

  it("satu SKU mencapai batas → seluruh picker keluar dari budget", () => {
    expect(isWithinBudget({}, 10)).toBe(true);
    expect(isWithinBudget({ map_load: 9, autocomplete: 9 }, 10)).toBe(true);
    expect(isWithinBudget({ map_load: 1, place_details: 10 }, 10)).toBe(false);
  });

  it("kunci bulan memakai UTC", () => {
    // 1 Nov 2026 03:00 WIB = 31 Okt 2026 20:00 UTC.
    expect(usageMonth(new Date("2026-10-31T20:00:00Z"))).toBe("2026-10");
  });
});

describe("circuit breaker", () => {
  it("terbuka setelah gagal, tertutup lagi setelah cooldown", () => {
    const now = 1_000_000;
    expect(isBreakerOpen(now)).toBe(false);
    tripBreaker(now);
    expect(isBreakerOpen(now + 1)).toBe(true);
    expect(isBreakerOpen(now + BREAKER_COOLDOWN_MS)).toBe(false);
  });
});

describe("mapPhotonFeatures", () => {
  it("judul = nama tempat, subjudul tanpa duplikat, koordinat [lon,lat] dibalik", () => {
    const [result] = mapPhotonFeatures({
      features: [
        {
          geometry: { coordinates: [107.6047, -6.9147] },
          properties: {
            osm_type: "N",
            osm_id: 123,
            name: "Pasar Baru",
            street: "Jalan Otto Iskandardinata",
            city: "Bandung",
            county: "Bandung",
            state: "Jawa Barat",
          },
        },
      ],
    });
    expect(result).toEqual({
      id: "N123",
      title: "Pasar Baru",
      subtitle: "Jalan Otto Iskandardinata, Bandung, Jawa Barat",
      coords: { latitude: -6.9147, longitude: 107.6047 },
    });
  });

  it("tanpa nama → judul jalan + nomor; tanpa judul sama sekali dibuang", () => {
    const results = mapPhotonFeatures({
      features: [
        {
          geometry: { coordinates: [106.8, -6.2] },
          properties: { street: "Jalan Kenanga", housenumber: "5" },
        },
        { geometry: { coordinates: [106.8, -6.2] }, properties: {} },
      ],
    });
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Jalan Kenanga 5");
  });
});

describe("mapPhotonFeatures: duplikat", () => {
  it("ruas jalan kembar (judul+subjudul sama) cukup tampil sekali", () => {
    const ruas = {
      geometry: { coordinates: [107.6, -6.9] as [number, number] },
      properties: { name: "Jalan Kenanga", city: "Bandung" },
    };
    expect(mapPhotonFeatures({ features: [ruas, ruas] })).toHaveLength(1);
  });
});

describe("searchPhoton", () => {
  it("response rusak / HTTP error / jaringan putus → [] tanpa throw", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ bukan: "geojson" })),
    );
    expect(await searchPhoton("pasar", null)).toEqual([]);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 503 })),
    );
    expect(await searchPhoton("pasar", null)).toEqual([]);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await searchPhoton("pasar", null)).toEqual([]);
  });
});

describe("Google Places", () => {
  it("memetakan prediksi autocomplete, koordinat diambil terpisah", () => {
    expect(
      mapAutocompleteResponse({
        suggestions: [
          {
            placePrediction: {
              placeId: "ChIJabc",
              text: { text: "Pasar Baru, Bandung" },
              structuredFormat: {
                mainText: { text: "Pasar Baru" },
                secondaryText: { text: "Bandung, Jawa Barat" },
              },
            },
          },
          {}, // queryPrediction (bukan tempat) diabaikan
        ],
      }),
    ).toEqual([
      {
        id: "ChIJabc",
        title: "Pasar Baru",
        subtitle: "Bandung, Jawa Barat",
        coords: null,
      },
    ]);
    expect(mapAutocompleteResponse({})).toEqual([]);
  });

  it("kuota habis (429) → throw GooglePlacesError supaya pemanggil fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 429 })),
    );
    await expect(
      googleAutocomplete({
        apiKey: "k",
        query: "pasar",
        sessionToken: "t",
        near: null,
      }),
    ).rejects.toBeInstanceOf(GooglePlacesError);
  });

  it("mengirim key lewat header, dibatasi Indonesia, dibias ke titik acuan", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ suggestions: [] }));
    vi.stubGlobal("fetch", fetchMock);
    await googleAutocomplete({
      apiKey: "rahasia",
      query: "pasar",
      sessionToken: "t",
      near: { latitude: -6.9, longitude: 107.6 },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).not.toContain("rahasia");
    expect(init.headers["X-Goog-Api-Key"]).toBe("rahasia");
    const body = JSON.parse(init.body);
    expect(body.includedRegionCodes).toEqual(["id"]);
    expect(body.locationBias.circle.center).toEqual({
      latitude: -6.9,
      longitude: 107.6,
    });
  });
});

describe("searchPlacesSchema", () => {
  const base = {
    query: "pasar baru",
    provider: "google",
    sessionToken: "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e",
  };

  it("menerima input valid", () => {
    expect(searchPlacesSchema.safeParse(base).success).toBe(true);
  });

  it("menolak query terlalu pendek, provider asing, token bukan UUID, koordinat di luar range", () => {
    expect(searchPlacesSchema.safeParse({ ...base, query: "ab" }).success).toBe(
      false,
    );
    expect(
      searchPlacesSchema.safeParse({ ...base, provider: "mapbox" }).success,
    ).toBe(false);
    expect(
      searchPlacesSchema.safeParse({ ...base, sessionToken: "x" }).success,
    ).toBe(false);
    expect(
      searchPlacesSchema.safeParse({
        ...base,
        near: { latitude: 91, longitude: 0 },
      }).success,
    ).toBe(false);
  });
});
