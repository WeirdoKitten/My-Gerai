import { describe, expect, it } from "vitest";
import { calculateOrderTotals } from "@/lib/utils/order-calc";

describe("calculateOrderTotals", () => {
  it("menghitung subtotal & total Pedagang untuk beberapa Item", () => {
    const result = calculateOrderTotals(
      [
        { price: 15000, qty: 2 },
        { price: 5000, qty: 1 },
      ],
      1000,
    );
    expect(result).toEqual({
      subtotal: 35000,
      platformFeeSnapshot: 1000,
      totalForMerchant: 34000,
    });
  });

  it("totalForMerchant sama dengan subtotal kalau Biaya Layanan nol", () => {
    const result = calculateOrderTotals([{ price: 10000, qty: 1 }], 0);
    expect(result.totalForMerchant).toBe(result.subtotal);
  });

  it("menghitung 1 Item qty 1 (kasus minimal)", () => {
    const result = calculateOrderTotals([{ price: 12000, qty: 1 }], 1000);
    expect(result).toEqual({
      subtotal: 12000,
      platformFeeSnapshot: 1000,
      totalForMerchant: 11000,
    });
  });

  it("menghitung qty besar dalam batas skema (50)", () => {
    const result = calculateOrderTotals([{ price: 1000, qty: 50 }], 1000);
    expect(result.subtotal).toBe(50000);
    expect(result.totalForMerchant).toBe(49000);
  });

  it("meng-clamp totalForMerchant ke 0 kalau Item gratis & Biaya Layanan > subtotal", () => {
    const result = calculateOrderTotals([{ price: 0, qty: 1 }], 1000);
    expect(result).toEqual({
      subtotal: 0,
      platformFeeSnapshot: 1000,
      totalForMerchant: 0,
    });
  });

  it("array Item kosong menghasilkan subtotal 0 & totalForMerchant ter-clamp 0", () => {
    const result = calculateOrderTotals([], 1000);
    expect(result).toEqual({
      subtotal: 0,
      platformFeeSnapshot: 1000,
      totalForMerchant: 0,
    });
  });
});
