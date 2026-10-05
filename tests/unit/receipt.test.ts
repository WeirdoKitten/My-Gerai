import { describe, expect, it } from "vitest";
import {
  buildReceiptLines,
  encodeEscPos,
  formatReceiptDateTime,
  RECEIPT_WIDTH,
  toPrintableAscii,
  wrapText,
} from "@/lib/utils/receipt";
import type { OrderReceiptView } from "@/types/order";

const baseReceipt: OrderReceiptView = {
  stallName: "Bakso Pak Budi",
  stallAddress: "Jl. Merdeka No. 10, Bandung",
  orderCode: "A7K2",
  buyerName: "Rina",
  buyerNote: null,
  // 14:32 WIB
  paidAt: new Date("2026-09-25T07:32:00Z"),
  scheduledFor: null,
  items: [
    {
      id: "1",
      productNameSnapshot: "Bakso Urat",
      priceSnapshot: 15000,
      qty: 2,
      note: null,
      variantSelections: [
        {
          groupNameSnapshot: "Level",
          optionNameSnapshot: "Pedas",
          priceDeltaSnapshot: 0,
        },
      ],
    },
    {
      id: "2",
      productNameSnapshot: "Es Teh",
      priceSnapshot: 5000,
      qty: 1,
      note: null,
      variantSelections: [],
    },
  ],
  subtotal: 35000,
  serviceFeePaid: 1000,
  deliveryFee: 0,
  amountPaid: 36000,
  delivery: null,
};

const texts = (receipt: OrderReceiptView) =>
  buildReceiptLines(receipt).map((line) => line.text);

describe("buildReceiptLines", () => {
  it("tidak ada baris yang melebihi lebar kertas 58mm", () => {
    const long: OrderReceiptView = {
      ...baseReceipt,
      stallName: "Warung Bakso dan Mie Ayam Legendaris Pak Budi Sejak 1987",
      items: [
        {
          ...baseReceipt.items[0],
          productNameSnapshot:
            "Bakso Urat Jumbo Isi Telur Puyuh Spesial Kuah Kaldu Sapi",
          note: "tanpa seledri, kuah dipisah, sambal banyak banget ya",
        },
      ],
      buyerNote: "Tolong dibungkus rapi karena mau dibawa pulang jauh",
    };
    for (const text of texts(long)) {
      expect(text.length).toBeLessThanOrEqual(RECEIPT_WIDTH);
    }
  });

  it("angka Item rata kanan sebaris dengan nama", () => {
    expect(texts(baseReceipt)).toContain(
      `2x Bakso Urat${"30.000".padStart(RECEIPT_WIDTH - 13)}`,
    );
    expect(texts(baseReceipt)).toContain("   Level: Pedas");
  });

  it("menampilkan Subtotal, Biaya Layanan, dan TOTAL yang dibayar Pembeli", () => {
    const lines = texts(baseReceipt);
    expect(
      lines.some((t) => t.startsWith("Subtotal") && t.endsWith("35.000")),
    ).toBe(true);
    expect(
      lines.some((t) => t.startsWith("Biaya Layanan") && t.endsWith("1.000")),
    ).toBe(true);
    expect(
      lines.some((t) => t.startsWith("TOTAL") && t.endsWith("Rp36.000")),
    ).toBe(true);
  });

  it("QRIS pribadi: tanpa baris Biaya Layanan, TOTAL = subtotal", () => {
    const lines = texts({
      ...baseReceipt,
      serviceFeePaid: 0,
      amountPaid: 35000,
    });
    expect(lines.some((t) => t.startsWith("Biaya Layanan"))).toBe(false);
    expect(
      lines.some((t) => t.startsWith("TOTAL") && t.endsWith("Rp35.000")),
    ).toBe(true);
  });

  it("footer sesuai permintaan User, dibungkus rata tengah", () => {
    const lines = buildReceiptLines(baseReceipt).slice(-3);
    expect(lines.map((l) => l.text)).toEqual([
      "Terima kasih telah berbelanja",
      "Barang yang sudah dibeli tidak",
      "dapat dikembalikan",
    ]);
    expect(lines.every((l) => l.align === "center")).toBe(true);
  });

  it("tanpa alamat Lapak, baris alamat tidak dicetak", () => {
    const lines = texts({ ...baseReceipt, stallAddress: null });
    expect(lines[0]).toBe("BAKSO PAK BUDI");
    expect(lines[1]).toBe("-".repeat(RECEIPT_WIDTH));
  });
});

describe("buildReceiptLines pre-order", () => {
  it("mencetak jadwal pre-order dalam WIB", () => {
    const texts = buildReceiptLines({
      ...baseReceipt,
      // 03.00 UTC = 10.00 WIB.
      scheduledFor: new Date("2026-10-03T03:00:00Z"),
    }).map((line) => line.text);
    expect(texts).toContain("PRE-ORDER");
    expect(texts).toContain("Jadwal: 03/10/2026 10:00");
  });

  it("Pesanan biasa tidak mencetak baris pre-order", () => {
    const texts = buildReceiptLines(baseReceipt).map((line) => line.text);
    expect(texts).not.toContain("PRE-ORDER");
  });
});

describe("formatReceiptDateTime", () => {
  it("memakai WIB dan format dd/mm/yyyy HH:mm", () => {
    expect(formatReceiptDateTime(baseReceipt.paidAt)).toBe("25/09/2026 14:32");
    expect(formatReceiptDateTime(new Date("2026-09-24T17:05:00Z"))).toBe(
      "25/09/2026 00:05",
    );
  });
});

describe("toPrintableAscii & wrapText", () => {
  it("membuang karakter yang tidak bisa dicetak printer", () => {
    expect(toPrintableAscii("Café “Enak” 🍜 Rp 1.000")).toBe(
      'Cafe "Enak"  Rp 1.000',
    );
  });

  it("memotong kata yang lebih panjang dari lebar", () => {
    expect(wrapText("abcdefghij kl", 4)).toEqual(["abcd", "efgh", "ij", "kl"]);
  });
});

describe("encodeEscPos", () => {
  it("diawali reset printer dan diakhiri feed kertas", () => {
    const bytes = encodeEscPos([{ text: "Hi", align: "center", bold: true }]);
    expect([...bytes.slice(0, 2)]).toEqual([0x1b, 0x40]);
    expect([...bytes.slice(-3)]).toEqual([0x1b, 0x64, 4]);
    // ESC a 1 (tengah), ESC E 1 (tebal), GS ! 0, "Hi", LF
    expect([...bytes.slice(2, 14)]).toEqual([
      0x1b, 0x61, 1, 0x1b, 0x45, 1, 0x1d, 0x21, 0, 0x48, 0x69, 0x0a,
    ]);
  });
});

describe("buildReceiptLines — Pesanan Antar", () => {
  const delivery: OrderReceiptView = {
    ...baseReceipt,
    deliveryFee: 5000,
    amountPaid: 41000,
    delivery: {
      buyerPhone: "6281234567890",
      address: "Jl. Kenanga No. 5, RT 02/RW 03",
      landmark: "Pagar hijau",
    },
  };

  it("mencetak penanda DIANTAR, HP, alamat, patokan, dan Ongkir", () => {
    const lines = texts(delivery);
    expect(lines).toContain("DIANTAR");
    expect(lines).toContain("0812-3456-7890");
    const joined = lines.join(" ");
    expect(joined).toContain("Jl. Kenanga No. 5");
    expect(joined).toContain("Patokan: Pagar hijau");
    expect(lines.some((line) => /^Ongkir\s+5\.000$/.test(line))).toBe(true);
    expect(lines.some((line) => /^TOTAL\s+Rp41\.000$/.test(line))).toBe(true);
  });

  it("QRIS pribadi + antar: Subtotal & Ongkir tercetak tanpa Biaya Layanan", () => {
    const lines = texts({ ...delivery, serviceFeePaid: 0, amountPaid: 40000 });
    expect(lines.some((line) => line.startsWith("Subtotal"))).toBe(true);
    expect(lines.some((line) => line.startsWith("Biaya Layanan"))).toBe(false);
    expect(lines.some((line) => line.startsWith("Ongkir"))).toBe(true);
  });

  it("Ambil sendiri tidak mencetak blok antar", () => {
    expect(texts(baseReceipt)).not.toContain("DIANTAR");
  });
});
