import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTtlCache } from "@/lib/cache/memory";
import { createOrderSchema } from "@/lib/validation/checkout.schema";

describe("createTtlCache", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("memakai hasil yang sama selama TTL, lalu memuat ulang", async () => {
    const cache = createTtlCache<string, number>({
      ttlMs: 1000,
      maxEntries: 10,
    });
    const load = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    expect(await cache.get("a", load)).toBe(1);
    expect(await cache.get("a", load)).toBe(1);
    vi.advanceTimersByTime(1001);
    expect(await cache.get("a", load)).toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("request bersamaan untuk key yang sama hanya memuat sekali", async () => {
    const cache = createTtlCache<string, number>({
      ttlMs: 1000,
      maxEntries: 10,
    });
    const load = vi.fn().mockResolvedValue(7);

    const results = await Promise.all([
      cache.get("a", load),
      cache.get("a", load),
      cache.get("a", load),
    ]);
    expect(results).toEqual([7, 7, 7]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("load yang gagal tidak disimpan", async () => {
    const cache = createTtlCache<string, number>({
      ttlMs: 1000,
      maxEntries: 10,
    });
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValueOnce(3);

    await expect(cache.get("a", load)).rejects.toThrow("db down");
    expect(await cache.get("a", load)).toBe(3);
  });

  it("membuang entri tertua saat melewati maxEntries", async () => {
    const cache = createTtlCache<string, string>({
      ttlMs: 1000,
      maxEntries: 2,
    });
    const load = vi.fn((key: string) => Promise.resolve(key));

    await cache.get("a", () => load("a"));
    await cache.get("b", () => load("b"));
    await cache.get("c", () => load("c"));
    await cache.get("a", () => load("a"));
    expect(load).toHaveBeenCalledTimes(4);
  });

  it("clear & delete mengosongkan cache", async () => {
    const cache = createTtlCache<string, number>({
      ttlMs: 1000,
      maxEntries: 10,
    });
    const load = vi.fn().mockResolvedValue(1);

    await cache.get("a", load);
    cache.delete("a");
    await cache.get("a", load);
    cache.clear();
    await cache.get("a", load);
    expect(load).toHaveBeenCalledTimes(3);
  });
});

describe("createOrderSchema: batas jumlah baris Item", () => {
  const item = {
    productId: "00000000-0000-4000-8000-000000000001",
    qty: 1,
  };
  const base = {
    merchantSlug: "lapak",
    buyerName: "Budi",
    fulfillmentMethod: "ambil_sendiri" as const,
  };

  it("menerima 50 baris", () => {
    const result = createOrderSchema.safeParse({
      ...base,
      items: Array.from({ length: 50 }, () => item),
    });
    expect(result.success).toBe(true);
  });

  it("menolak lebih dari 50 baris", () => {
    const result = createOrderSchema.safeParse({
      ...base,
      items: Array.from({ length: 51 }, () => item),
    });
    expect(result.success).toBe(false);
  });
});
