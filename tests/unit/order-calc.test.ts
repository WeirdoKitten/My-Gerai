import { describe, expect, it } from "vitest";
import { calculateOrderTotals, orderGrandTotal } from "@/lib/utils/order-calc";

describe("calculateOrderTotals", () => {
  it("Pedagang terima subtotal penuh, Pembeli bayar subtotal + Biaya Layanan", () => {
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
      totalForMerchant: 35000,
      grandTotal: 36000,
    });
  });

  it("1 Item Rp10.000 → Pembeli bayar Rp11.000, Pedagang terima Rp10.000", () => {
    const result = calculateOrderTotals([{ price: 10000, qty: 1 }], 1000);
    expect(result).toEqual({
      subtotal: 10000,
      platformFeeSnapshot: 1000,
      totalForMerchant: 10000,
      grandTotal: 11000,
    });
  });

  it("Biaya Layanan nol → grandTotal = subtotal", () => {
    const result = calculateOrderTotals([{ price: 12000, qty: 1 }], 0);
    expect(result.grandTotal).toBe(result.subtotal);
    expect(result.totalForMerchant).toBe(12000);
  });

  it("qty besar dalam batas skema (50)", () => {
    const result = calculateOrderTotals([{ price: 1000, qty: 50 }], 1000);
    expect(result.subtotal).toBe(50000);
    expect(result.totalForMerchant).toBe(50000);
    expect(result.grandTotal).toBe(51000);
  });

  it("Item gratis → Pedagang terima 0, Pembeli tetap bayar Biaya Layanan", () => {
    const result = calculateOrderTotals([{ price: 0, qty: 1 }], 1000);
    expect(result).toEqual({
      subtotal: 0,
      platformFeeSnapshot: 1000,
      totalForMerchant: 0,
      grandTotal: 1000,
    });
  });

  it("array Item kosong → subtotal 0, grandTotal = Biaya Layanan", () => {
    const result = calculateOrderTotals([], 1000);
    expect(result).toEqual({
      subtotal: 0,
      platformFeeSnapshot: 1000,
      totalForMerchant: 0,
      grandTotal: 1000,
    });
  });
});

describe("orderGrandTotal", () => {
  it("menjumlahkan subtotal + platformFeeSnapshot dari Pesanan tersimpan", () => {
    expect(
      orderGrandTotal({ subtotal: 27000, platformFeeSnapshot: 1000 }),
    ).toBe(28000);
  });
});
