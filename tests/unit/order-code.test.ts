import { describe, expect, it } from "vitest";
import { generateOrderCode, ORDER_CODE_PATTERN } from "@/lib/utils/order-code";
import { trackOrderSchema } from "@/lib/validation/checkout.schema";

describe("generateOrderCode", () => {
  it("8 karakter, selalu cocok ORDER_CODE_PATTERN (tanpa 0/O/1/I)", () => {
    for (let i = 0; i < 500; i++) {
      const code = generateOrderCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(ORDER_CODE_PATTERN);
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it("bervariasi (bukan konstanta)", () => {
    const codes = new Set(
      Array.from({ length: 200 }, () => generateOrderCode()),
    );
    expect(codes.size).toBe(200);
  });
});

describe("trackOrderSchema", () => {
  it("menormalisasi huruf kecil & spasi", () => {
    expect(trackOrderSchema.parse({ orderCode: " k7qx 9mb4 " })).toEqual({
      orderCode: "K7QX9MB4",
    });
  });

  it.each([
    "B7K2",
    "K7QX9MB",
    "K7QX9MB45",
    "K7QX9MBO",
    "K7QX-9MB4",
    "",
  ])("menolak %s (kode lama / format salah)", (orderCode) => {
    expect(trackOrderSchema.safeParse({ orderCode }).success).toBe(false);
  });
});
