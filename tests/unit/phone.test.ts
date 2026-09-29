import { describe, expect, it } from "vitest";
import {
  formatIndonesianPhone,
  normalizeIndonesianPhone,
} from "@/lib/utils/phone";

describe("normalizeIndonesianPhone", () => {
  it.each([
    ["081234567890", "6281234567890"],
    ["6281234567890", "6281234567890"],
    ["+62 812-3456-7890", "6281234567890"],
    ["81234567890", "6281234567890"],
    ["0812.3456.7890", "6281234567890"],
    ["(0812) 3456 7890", "6281234567890"],
  ])("%s -> %s", (raw, expected) => {
    expect(normalizeIndonesianPhone(raw)).toBe(expected);
  });

  it.each([
    "",
    "0212345678", // telepon rumah, bukan seluler
    "0812345", // terlalu pendek
    "08123456789012345", // terlalu panjang
    "0812abc4567",
    "+1 555 123 4567",
  ])("menolak %s", (raw) => {
    expect(normalizeIndonesianPhone(raw)).toBeNull();
  });
});

describe("formatIndonesianPhone", () => {
  it("menampilkan format lokal berkelompok", () => {
    expect(formatIndonesianPhone("6281234567890")).toBe("0812-3456-7890");
  });
});
