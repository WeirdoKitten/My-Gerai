import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  getMerchantInsights,
  type InsightInput,
  type InsightItem,
  isInsightDataSufficient,
} from "@/lib/report/insights";

const NOW = new Date("2026-09-15T05:00:00.000Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

function item(overrides: Partial<InsightItem> = {}): InsightItem {
  return {
    productId: randomUUID(),
    name: "Item",
    price: 10_000,
    status: "available",
    stock: null,
    qtySold7d: 7,
    qtySold30d: 30,
    revenue30d: 300_000,
    lastSoldAt: ago(1),
    createdAt: ago(40),
    ...overrides,
  };
}

/** Input yang lolos gerbang data tapi TIDAK memicu satu rule pun. */
function baseInput(overrides: Partial<InsightInput> = {}): InsightInput {
  return {
    now: NOW,
    firstOrderAt: ago(20),
    paidOrderCount30d: 60,
    items: [
      item({ name: "A", revenue30d: 100_000 }),
      item({ name: "B", revenue30d: 100_000 }),
      item({ name: "C", revenue30d: 100_000 }),
    ],
    hourlyOrderCounts: Array.from({ length: 24 }, () => 2),
    weekdayStats: Array.from({ length: 7 }, (_, dow) => ({
      dow,
      totalRevenue: 400_000,
      distinctDays: 4,
    })),
    avgDailyRevenue: 100_000,
    topPair: null,
    ...overrides,
  };
}

describe("isInsightDataSufficient", () => {
  it("false kalau Pesanan 30 hari < ambang", () => {
    expect(isInsightDataSufficient(baseInput({ paidOrderCount30d: 19 }))).toBe(
      false,
    );
  });

  it("false kalau riwayat < 7 hari", () => {
    expect(isInsightDataSufficient(baseInput({ firstOrderAt: ago(6) }))).toBe(
      false,
    );
  });

  it("false kalau belum ada Pesanan sama sekali", () => {
    expect(isInsightDataSufficient(baseInput({ firstOrderAt: null }))).toBe(
      false,
    );
  });

  it("true kalau data cukup", () => {
    expect(isInsightDataSufficient(baseInput())).toBe(true);
  });
});

describe("getMerchantInsights — gerbang data", () => {
  it("kosong saat data belum cukup", () => {
    expect(getMerchantInsights(baseInput({ paidOrderCount30d: 5 }))).toEqual(
      [],
    );
  });

  it("input dasar tidak memicu rule apa pun", () => {
    expect(getMerchantInsights(baseInput())).toEqual([]);
  });
});

describe("getMerchantInsights — tiap rule", () => {
  it("restock: Item ber-stok yang lajunya melampaui stok", () => {
    const input = baseInput({
      items: [
        item({ name: "Bakso Urat", stock: 5, qtySold7d: 21 }),
        item({ name: "B", revenue30d: 100_000 }),
        item({ name: "C", revenue30d: 100_000 }),
      ],
    });
    const kinds = getMerchantInsights(input).map((i) => i.kind);
    expect(kinds).toContain("restock");
  });

  it("restock: diam kalau stok masih cukup", () => {
    const input = baseInput({
      items: [
        item({ name: "Bakso Urat", stock: 200, qtySold7d: 21 }),
        item({ name: "B" }),
        item({ name: "C" }),
      ],
    });
    expect(getMerchantInsights(input).map((i) => i.kind)).not.toContain(
      "restock",
    );
  });

  it("item_mati: Item lama yang tidak laku ≥ 14 hari", () => {
    const input = baseInput({
      items: [
        item({ name: "A", revenue30d: 100_000 }),
        item({ name: "B", revenue30d: 100_000 }),
        item({
          name: "Pangsit",
          revenue30d: 0,
          qtySold7d: 0,
          qtySold30d: 0,
          lastSoldAt: ago(30),
          createdAt: ago(60),
        }),
      ],
    });
    const dead = getMerchantInsights(input).find((i) => i.kind === "item_mati");
    expect(dead?.title).toContain("Pangsit");
  });

  it("item_mati: diam untuk Item yang baru dibuat", () => {
    const input = baseInput({
      items: [
        item({ name: "A" }),
        item({ name: "B" }),
        item({
          name: "Baru",
          revenue30d: 0,
          qtySold30d: 0,
          lastSoldAt: null,
          createdAt: ago(3),
        }),
      ],
    });
    expect(getMerchantInsights(input).map((i) => i.kind)).not.toContain(
      "item_mati",
    );
  });

  it("jam_ramai: satu blok jam menyerap ≥ 25% Pesanan", () => {
    const hourly = Array.from({ length: 24 }, () => 1);
    hourly[12] = 20;
    hourly[13] = 15;
    const insight = getMerchantInsights(
      baseInput({ hourlyOrderCounts: hourly }),
    ).find((i) => i.kind === "jam_ramai");
    expect(insight?.title).toContain("12");
  });

  it("hari_sepi: satu hari jauh di bawah rata-rata", () => {
    const weekdayStats = Array.from({ length: 7 }, (_, dow) => ({
      dow,
      totalRevenue: dow === 3 ? 40_000 : 400_000,
      distinctDays: 4,
    }));
    const insight = getMerchantInsights(baseInput({ weekdayStats })).find(
      (i) => i.kind === "hari_sepi",
    );
    expect(insight?.title).toContain("Rabu");
  });

  it("fokus_menu: sedikit Item menyumbang ≥ 80% omzet", () => {
    const input = baseInput({
      items: [
        item({ name: "Bakso Urat", revenue30d: 800_000 }),
        item({ name: "B", revenue30d: 60_000 }),
        item({ name: "C", revenue30d: 60_000 }),
        item({ name: "D", revenue30d: 50_000 }),
        item({ name: "E", revenue30d: 30_000 }),
      ],
    });
    const insight = getMerchantInsights(input).find(
      (i) => i.kind === "fokus_menu",
    );
    expect(insight?.body).toContain("Bakso Urat");
  });

  it("sering_bareng: pasangan Item dengan co-occurrence tinggi", () => {
    const input = baseInput({
      topPair: { nameA: "Bakso Urat", nameB: "Es Teh Manis", count: 12 },
    });
    const insight = getMerchantInsights(input).find(
      (i) => i.kind === "sering_bareng",
    );
    expect(insight?.title).toContain("Es Teh Manis");
  });

  it("sering_bareng: diam kalau co-occurrence rendah", () => {
    const input = baseInput({
      topPair: { nameA: "A", nameB: "B", count: 3 },
    });
    expect(getMerchantInsights(input).map((i) => i.kind)).not.toContain(
      "sering_bareng",
    );
  });

  it("harga: Item terlaris yang harganya di bawah median", () => {
    const input = baseInput({
      items: [
        item({ name: "Es Teh", price: 5_000, qtySold30d: 90 }),
        item({ name: "Bakso Urat", price: 15_000, qtySold30d: 40 }),
        item({ name: "Mie Ayam", price: 17_000, qtySold30d: 20 }),
      ],
    });
    const insight = getMerchantInsights(input).find((i) => i.kind === "harga");
    expect(insight?.title).toContain("Es Teh");
  });

  it("hasil terurut prioritas menurun", () => {
    const input = baseInput({
      items: [
        item({
          name: "Bakso Urat",
          stock: 5,
          qtySold7d: 21,
          revenue30d: 800_000,
        }),
        item({ name: "B", revenue30d: 60_000 }),
        item({ name: "C", revenue30d: 60_000 }),
        item({ name: "D", revenue30d: 40_000 }),
      ],
      topPair: { nameA: "A", nameB: "B", count: 9 },
    });
    const priorities = getMerchantInsights(input).map((i) => i.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => b - a));
    expect(priorities.length).toBeGreaterThan(1);
  });
});
