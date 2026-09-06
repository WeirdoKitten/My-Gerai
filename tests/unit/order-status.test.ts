import { describe, expect, it } from "vitest";
import {
  isOrderExpired,
  nextMerchantStatus,
  type OrderStatus,
} from "@/lib/utils/order-status";

describe("isOrderExpired", () => {
  const expiresAt = new Date("2026-01-01T00:15:00.000Z");

  it("false saat now tepat sama dengan expiresAt (kode pakai > bukan >=)", () => {
    expect(
      isOrderExpired("menunggu_pembayaran", expiresAt, new Date(expiresAt)),
    ).toBe(false);
  });

  it("false 1ms sebelum expiresAt", () => {
    const now = new Date(expiresAt.getTime() - 1);
    expect(isOrderExpired("menunggu_pembayaran", expiresAt, now)).toBe(false);
  });

  it("true 1ms sesudah expiresAt", () => {
    const now = new Date(expiresAt.getTime() + 1);
    expect(isOrderExpired("menunggu_pembayaran", expiresAt, now)).toBe(true);
  });

  it.each<OrderStatus>([
    "dibayar",
    "diproses",
    "siap_diambil",
    "selesai",
    "dibatalkan",
    "kedaluwarsa",
  ])("false untuk status %s meski now jauh melewati expiresAt", (status) => {
    const now = new Date(expiresAt.getTime() + 60_000);
    expect(isOrderExpired(status, expiresAt, now)).toBe(false);
  });
});

describe("nextMerchantStatus", () => {
  it("dibayar -> diproses", () => {
    expect(nextMerchantStatus("dibayar")).toBe("diproses");
  });

  it("diproses -> siap_diambil", () => {
    expect(nextMerchantStatus("diproses")).toBe("siap_diambil");
  });

  it("siap_diambil -> selesai", () => {
    expect(nextMerchantStatus("siap_diambil")).toBe("selesai");
  });

  it.each<OrderStatus>([
    "selesai",
    "menunggu_pembayaran",
    "kedaluwarsa",
    "dibatalkan",
  ])("null untuk status final/tanpa aksi Pedagang: %s", (status) => {
    expect(nextMerchantStatus(status)).toBeNull();
  });
});
