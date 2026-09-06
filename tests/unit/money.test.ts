import { describe, expect, it } from "vitest";
import { formatRupiah } from "@/lib/utils/money";

describe("formatRupiah", () => {
  // Intl.NumberFormat("id-ID") menyisipkan non-breaking space ( )
  // antara "Rp" dan angka, bukan spasi biasa.
  it("memformat 0", () => {
    expect(formatRupiah(0)).toBe("Rp 0");
  });

  it("memformat dengan pemisah ribuan format Indonesia", () => {
    expect(formatRupiah(15000)).toBe("Rp 15.000");
  });
});
