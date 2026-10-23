import { describe, expect, it } from "vitest";
import {
  type SummaryItem,
  type SummaryOrder,
  type SummaryStall,
  summarizeEventSales,
} from "@/lib/event/sales-summary";
import {
  latestSubstitutedAt,
  toSubstitutionView,
} from "@/lib/utils/order-substitution";
import { createProxyStallSchema } from "@/lib/validation/event.schema";
import { setOrderItemSubstitutionSchema } from "@/lib/validation/order-substitution.schema";

function uuid(n: number): string {
  return `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
}

describe("setOrderItemSubstitutionSchema", () => {
  const base = { orderId: uuid(1), orderItemId: uuid(2) };

  it("menerima 'diganti' dengan nama pengganti", () => {
    const result = setOrderItemSubstitutionSchema.safeParse({
      ...base,
      kind: "diganti",
      substituteName: "  Keripik Pedas 250 g ",
    });
    expect(result.success).toBe(true);
    expect(result.data?.substituteName).toBe("Keripik Pedas 250 g");
  });

  it("menolak 'diganti' tanpa nama pengganti", () => {
    for (const substituteName of [undefined, "", "   "]) {
      const result = setOrderItemSubstitutionSchema.safeParse({
        ...base,
        kind: "diganti",
        substituteName,
      });
      expect(result.success).toBe(false);
    }
  });

  it("menerima 'tidak_tersedia' dan pembatalan (null) tanpa nama", () => {
    for (const kind of ["tidak_tersedia", null]) {
      expect(
        setOrderItemSubstitutionSchema.safeParse({ ...base, kind }).success,
      ).toBe(true);
    }
  });

  it("menolak jenis lain dan ID bukan UUID", () => {
    expect(
      setOrderItemSubstitutionSchema.safeParse({ ...base, kind: "refund" })
        .success,
    ).toBe(false);
    expect(
      setOrderItemSubstitutionSchema.safeParse({
        orderId: "1",
        orderItemId: uuid(2),
        kind: null,
      }).success,
    ).toBe(false);
  });
});

describe("createProxyStallSchema", () => {
  it("menerima nama & kategori, menolak yang kosong", () => {
    expect(
      createProxyStallSchema.safeParse({
        eventId: uuid(1),
        stallName: "Toko Bu Ani",
        category: "Oleh-oleh",
      }).success,
    ).toBe(true);
    expect(
      createProxyStallSchema.safeParse({
        eventId: uuid(1),
        stallName: " ",
        category: "Oleh-oleh",
      }).success,
    ).toBe(false);
  });
});

describe("toSubstitutionView", () => {
  const item = { priceSnapshot: 12_000, qty: 3, substituteName: null };

  it("null kalau sesuai pesanan", () => {
    expect(toSubstitutionView({ ...item, substitution: null })).toBeNull();
  });

  it("'tidak_tersedia' menghitung uang kembali = harga x qty", () => {
    expect(
      toSubstitutionView({ ...item, substitution: "tidak_tersedia" }),
    ).toEqual({
      kind: "tidak_tersedia",
      substituteName: null,
      refundAmount: 36_000,
    });
  });

  it("'diganti' membawa nama pengganti, tanpa uang kembali", () => {
    expect(
      toSubstitutionView({
        ...item,
        substitution: "diganti",
        substituteName: "Dodol Nanas",
      }),
    ).toEqual({
      kind: "diganti",
      substituteName: "Dodol Nanas",
      refundAmount: null,
    });
  });
});

describe("latestSubstitutedAt", () => {
  it("ambil waktu paling baru, null kalau belum pernah diubah", () => {
    expect(latestSubstitutedAt([{ substitutedAt: null }])).toBeNull();
    expect(
      latestSubstitutedAt([
        { substitutedAt: new Date("2026-10-21T03:00:00Z") },
        { substitutedAt: null },
        { substitutedAt: new Date("2026-10-21T04:00:00Z") },
      ]),
    ).toBe("2026-10-21T04:00:00.000Z");
  });
});

describe("summarizeEventSales", () => {
  const stalls: SummaryStall[] = [
    { merchantId: "asli", stallName: "Bakso Pak Kumis", isProxy: false },
    { merchantId: "titip", stallName: "Toko Bu Ani", isProxy: true },
  ];

  it("Gerai asli hanya jumlah Pesanan, Gerai Titipan lengkap dengan uang", () => {
    const orders: SummaryOrder[] = [
      { ...stalls[0], id: "o1", subtotal: 30_000 },
      { ...stalls[0], id: "o2", subtotal: 15_000 },
      { ...stalls[1], id: "o3", subtotal: 50_000 },
    ];
    const items: SummaryItem[] = [
      // 2 x 15.000, modal 10.000 -> modal 20.000
      {
        orderId: "o3",
        priceSnapshot: 15_000,
        costPriceSnapshot: 10_000,
        qty: 2,
        substitution: "diganti",
      },
      // Tidak tersedia: 20.000 dikembalikan, modal tidak dihitung
      {
        orderId: "o3",
        priceSnapshot: 20_000,
        costPriceSnapshot: 15_000,
        qty: 1,
        substitution: "tidak_tersedia",
      },
    ];

    const summary = summarizeEventSales(stalls, orders, items);

    expect(summary.totalOrders).toBe(3);
    expect(summary.stalls[0]).toMatchObject({ orderCount: 2, sales: null });
    expect(summary.stalls[1]).toMatchObject({
      orderCount: 1,
      sales: {
        revenue: 50_000,
        cost: 20_000,
        refundDue: 20_000,
        profit: 10_000,
        profitIncomplete: false,
      },
    });
    expect(summary.proxyTotals).toEqual(summary.stalls[1].sales);
  });

  it("menandai keuntungan belum lengkap kalau ada Item tanpa harga beli", () => {
    const summary = summarizeEventSales(
      stalls,
      [{ ...stalls[1], id: "o1", subtotal: 10_000 }],
      [
        {
          orderId: "o1",
          priceSnapshot: 10_000,
          costPriceSnapshot: null,
          qty: 1,
          substitution: null,
        },
      ],
    );
    expect(summary.stalls[1].sales?.profitIncomplete).toBe(true);
    expect(summary.proxyTotals?.profitIncomplete).toBe(true);
  });

  it("Gerai tanpa Pesanan tetap tampil; Gerai yang sudah keluar event ikut di akhir", () => {
    const summary = summarizeEventSales(
      stalls,
      [
        {
          id: "o9",
          merchantId: "lama",
          stallName: "Gerai Lama",
          isProxy: false,
          subtotal: 5_000,
        },
      ],
      [],
    );
    expect(summary.stalls.map((stall) => stall.merchantId)).toEqual([
      "asli",
      "titip",
      "lama",
    ]);
    expect(summary.stalls[1].orderCount).toBe(0);
    expect(summary.stalls[2].orderCount).toBe(1);
  });

  it("proxyTotals null kalau event tidak punya Gerai Titipan", () => {
    expect(summarizeEventSales([stalls[0]], [], []).proxyTotals).toBeNull();
  });
});
