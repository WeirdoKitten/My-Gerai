import { describe, expect, it } from "vitest";
import { detectImage } from "@/lib/upload/storage";
import { PRODUCT_PHOTO_URL_PATTERN } from "@/lib/validation/product.schema";

describe("detectImage (magic bytes)", () => {
  it("mengenali JPEG", () => {
    const b = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectImage(b)).toBe("jpg");
  });

  it("mengenali PNG", () => {
    const b = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectImage(b)).toBe("png");
  });

  it("mengenali WebP", () => {
    const b = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
      Buffer.from("WEBP", "ascii"),
    ]);
    expect(detectImage(b)).toBe("webp");
  });

  it("menolak file teks (mis. .txt yang di-rename jadi .jpg)", () => {
    expect(
      detectImage(Buffer.from("bukan gambar, cuma teks biasa")),
    ).toBeNull();
  });

  it("menolak SVG (bisa memuat script)", () => {
    expect(detectImage(Buffer.from("<svg xmlns=..."))).toBeNull();
  });
});

describe("PRODUCT_PHOTO_URL_PATTERN", () => {
  const uuid = "5aa9653c-ae68-46c2-b0bb-379fac580d04";

  it("menerima path upload yang sah", () => {
    expect(`/uploads/products/${uuid}.jpg`).toMatch(PRODUCT_PHOTO_URL_PATTERN);
    expect(`/uploads/products/${uuid}.png`).toMatch(PRODUCT_PHOTO_URL_PATTERN);
    expect(`/uploads/products/${uuid}.webp`).toMatch(PRODUCT_PHOTO_URL_PATTERN);
  });

  it("menolak URL eksternal & path traversal & ekstensi lain", () => {
    for (const bad of [
      "https://evil.example/x.jpg",
      "/uploads/products/../../etc/passwd",
      `/uploads/products/${uuid}.svg`,
      `/uploads/products/${uuid}.jpg.exe`,
      "/etc/passwd",
      `/uploads/other/${uuid}.jpg`,
    ]) {
      expect(bad).not.toMatch(PRODUCT_PHOTO_URL_PATTERN);
    }
  });
});
