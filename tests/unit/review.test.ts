import { describe, expect, it } from "vitest";
import {
  formatRating,
  maskBuyerName,
  toRatingSummary,
} from "@/lib/review/rating";
import { submitOrderReviewSchema } from "@/lib/validation/review.schema";

const ORDER_ID = "8f9b2a3e-1c4d-4e5f-9a6b-7c8d9e0f1a2b";

describe("toRatingSummary", () => {
  it("null kalau belum ada ulasan", () => {
    expect(toRatingSummary(0, 0)).toEqual({ average: null, count: 0 });
  });

  it("rata-rata dibulatkan 1 desimal", () => {
    expect(toRatingSummary(14, 3)).toEqual({ average: 4.7, count: 3 });
    expect(toRatingSummary(5, 1)).toEqual({ average: 5, count: 1 });
  });
});

describe("formatRating", () => {
  it("koma desimal & selalu 1 angka di belakang koma", () => {
    expect(formatRating(4.5)).toBe("4,5");
    expect(formatRating(5)).toBe("5,0");
  });
});

describe("maskBuyerName", () => {
  it("kata pertama + inisial kata kedua", () => {
    expect(maskBuyerName("Budi Santoso Wijaya")).toBe("Budi S.");
    expect(maskBuyerName("  siti   aminah ")).toBe("siti A.");
  });

  it("satu kata tampil apa adanya, kosong jadi 'Pembeli'", () => {
    expect(maskBuyerName("Budi")).toBe("Budi");
    expect(maskBuyerName("   ")).toBe("Pembeli");
  });
});

describe("submitOrderReviewSchema", () => {
  it("rating wajib bilangan bulat 1-5", () => {
    for (const rating of [0, 6, 3.5]) {
      expect(
        submitOrderReviewSchema.safeParse({ orderId: ORDER_ID, rating })
          .success,
      ).toBe(false);
    }
    expect(
      submitOrderReviewSchema.safeParse({ orderId: ORDER_ID, rating: 5 })
        .success,
    ).toBe(true);
  });

  it("komentar di-trim, kosong jadi null, maks 500 karakter", () => {
    const blank = submitOrderReviewSchema.parse({
      orderId: ORDER_ID,
      rating: 4,
      comment: "   ",
    });
    expect(blank.comment).toBeNull();
    const trimmed = submitOrderReviewSchema.parse({
      orderId: ORDER_ID,
      rating: 4,
      comment: "  Enak  ",
    });
    expect(trimmed.comment).toBe("Enak");
    expect(
      submitOrderReviewSchema.safeParse({
        orderId: ORDER_ID,
        rating: 4,
        comment: "a".repeat(501),
      }).success,
    ).toBe(false);
  });

  it("orderId wajib UUID", () => {
    expect(
      submitOrderReviewSchema.safeParse({ orderId: "abc", rating: 4 }).success,
    ).toBe(false);
  });
});
