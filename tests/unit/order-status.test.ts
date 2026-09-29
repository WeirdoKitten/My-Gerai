import { describe, expect, it } from "vitest";
import {
  DELIVERY_FAIL_MIN_MINUTES,
  FINAL_ORDER_STATUSES,
  isOrderExpired,
  minutesUntilDeliveryFailAllowed,
  nextMerchantStatus,
  type OrderStatus,
  PAID_ORDER_STATUSES,
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

describe("nextMerchantStatus — Pesanan Antar", () => {
  it("diproses -> sedang_diantar (bukan siap_diambil)", () => {
    expect(nextMerchantStatus("diproses", "antar")).toBe("sedang_diantar");
  });

  it("sedang_diantar -> selesai", () => {
    expect(nextMerchantStatus("sedang_diantar", "antar")).toBe("selesai");
  });

  it("Pesanan antar tidak pernah lewat siap_diambil", () => {
    expect(nextMerchantStatus("siap_diambil", "antar")).toBeNull();
  });

  it("Pesanan ambil sendiri tidak bisa masuk sedang_diantar", () => {
    expect(nextMerchantStatus("sedang_diantar", "ambil_sendiri")).toBeNull();
  });

  it("gagal_diantar tidak punya aksi lanjutan", () => {
    expect(nextMerchantStatus("gagal_diantar", "antar")).toBeNull();
  });
});

describe("status Pesanan Antar di himpunan status", () => {
  it("gagal_diantar = status akhir", () => {
    expect(FINAL_ORDER_STATUSES).toContain("gagal_diantar");
  });

  it("sedang_diantar & gagal_diantar tetap dihitung lunas (tanpa refund)", () => {
    expect(PAID_ORDER_STATUSES).toContain("sedang_diantar");
    expect(PAID_ORDER_STATUSES).toContain("gagal_diantar");
  });
});

describe("minutesUntilDeliveryFailAllowed", () => {
  const startedAt = new Date("2026-01-01T10:00:00.000Z");

  it("belum mulai antar -> jeda penuh", () => {
    expect(minutesUntilDeliveryFailAllowed(null)).toBe(
      DELIVERY_FAIL_MIN_MINUTES,
    );
  });

  it("baru mulai -> jeda penuh", () => {
    expect(minutesUntilDeliveryFailAllowed(startedAt, startedAt)).toBe(15);
  });

  it("14 menit 1 detik -> masih 1 menit (dibulatkan ke atas)", () => {
    const now = new Date(startedAt.getTime() + 14 * 60_000 + 1000);
    expect(minutesUntilDeliveryFailAllowed(startedAt, now)).toBe(1);
  });

  it("tepat 15 menit -> sudah boleh", () => {
    const now = new Date(startedAt.getTime() + 15 * 60_000);
    expect(minutesUntilDeliveryFailAllowed(startedAt, now)).toBe(0);
  });
});
