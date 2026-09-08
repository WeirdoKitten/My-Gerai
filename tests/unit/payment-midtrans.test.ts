import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPaymentProvider, getPaymentProviderName } from "@/lib/payment";
import { midtransPaymentProvider } from "@/lib/payment/midtrans-provider";
import { mockPaymentProvider } from "@/lib/payment/mock-provider";

const SERVER_KEY = "SB-Mid-server-TESTKEY";
const ORDER_ID = "3f2b1a9c-0000-4000-8000-000000000abc";

function sign(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey = SERVER_KEY,
): string {
  return createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");
}

function notification(over: Record<string, unknown> = {}) {
  const status_code = "200";
  const gross_amount = "27000.00";
  return {
    order_id: ORDER_ID,
    transaction_id: "trx-123",
    status_code,
    gross_amount,
    transaction_status: "settlement",
    fraud_status: "accept",
    signature_key: sign(ORDER_ID, status_code, gross_amount),
    ...over,
  };
}

beforeEach(() => {
  vi.stubEnv("MIDTRANS_SERVER_KEY", SERVER_KEY);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("midtransPaymentProvider.handleCallback — verifikasi signature", () => {
  it("menerima notifikasi dengan signature sah", async () => {
    const r = await midtransPaymentProvider.handleCallback(notification());
    expect(r).toEqual({
      referenceId: "trx-123",
      orderId: ORDER_ID,
      status: "success",
    });
  });

  it("menolak (null) kalau signature dipalsukan", async () => {
    const r = await midtransPaymentProvider.handleCallback(
      notification({ signature_key: "0".repeat(128) }),
    );
    expect(r).toBeNull();
  });

  it("menolak kalau gross_amount di payload diubah (signature tak cocok)", async () => {
    const r = await midtransPaymentProvider.handleCallback(
      notification({ gross_amount: "1000.00" }),
    );
    expect(r).toBeNull();
  });

  it("menolak kalau order_id diubah (signature tak cocok)", async () => {
    const r = await midtransPaymentProvider.handleCallback(
      notification({ order_id: "orang-lain" }),
    );
    expect(r).toBeNull();
  });

  it("menolak payload yang tidak lengkap", async () => {
    const r = await midtransPaymentProvider.handleCallback({ foo: "bar" });
    expect(r).toBeNull();
  });

  it("menerima signature huruf besar (case-insensitive hex)", async () => {
    const s = sign(ORDER_ID, "200", "27000.00").toUpperCase();
    const r = await midtransPaymentProvider.handleCallback(
      notification({ signature_key: s }),
    );
    expect(r?.status).toBe("success");
  });
});

describe("midtransPaymentProvider.handleCallback — peta status", () => {
  const cases: Array<[string, string | undefined, string]> = [
    ["settlement", "accept", "success"],
    ["capture", "accept", "success"],
    ["capture", undefined, "success"],
    ["capture", "challenge", "pending"],
    ["pending", undefined, "pending"],
    ["expire", undefined, "expired"],
    ["deny", undefined, "failed"],
    ["cancel", undefined, "failed"],
  ];

  for (const [transaction_status, fraud_status, expected] of cases) {
    it(`${transaction_status}/${fraud_status ?? "-"} → ${expected}`, async () => {
      const over: Record<string, unknown> = { transaction_status };
      if (fraud_status === undefined) over.fraud_status = undefined;
      else over.fraud_status = fraud_status;
      const r = await midtransPaymentProvider.handleCallback(
        notification(over),
      );
      expect(r?.status).toBe(expected);
    });
  }
});

describe("midtransPaymentProvider.createPayment — sumber QR", () => {
  const input = { orderId: ORDER_ID, grossAmount: 27000, expiryMinutes: 15 };

  function stubCharge(json: unknown, ok = true) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok,
        status: ok ? 200 : 400,
        json: async () => json,
      })),
    );
  }

  it("pakai qr_string kalau ada", async () => {
    stubCharge({
      transaction_id: "trx-1",
      transaction_status: "pending",
      qr_string: "00020101021226...",
    });
    const r = await midtransPaymentProvider.createPayment(input);
    expect(r).toMatchObject({
      referenceId: "trx-1",
      qrString: "00020101021226...",
    });
  });

  it("fallback ke actions generate-qr-code kalau qr_string tidak ada", async () => {
    stubCharge({
      transaction_id: "trx-2",
      transaction_status: "pending",
      actions: [
        {
          name: "generate-qr-code",
          url: "https://api.sandbox.midtrans.com/v2/qris/trx-2/qr-code",
        },
      ],
    });
    const r = await midtransPaymentProvider.createPayment(input);
    expect(r.qrString).toBe(
      "https://api.sandbox.midtrans.com/v2/qris/trx-2/qr-code",
    );
  });

  it("melempar kalau qr_string DAN actions tidak ada", async () => {
    stubCharge({
      transaction_id: "trx-3",
      transaction_status: "pending",
      status_message: "no qr",
    });
    await expect(midtransPaymentProvider.createPayment(input)).rejects.toThrow(
      /Midtrans charge gagal/,
    );
  });

  it("melempar kalau HTTP tidak ok", async () => {
    stubCharge({ status_message: "invalid" }, false);
    await expect(midtransPaymentProvider.createPayment(input)).rejects.toThrow(
      /Midtrans charge gagal/,
    );
  });
});

describe("getPaymentProvider — pemilihan lewat env", () => {
  it("default (env kosong) → mock", () => {
    vi.stubEnv("PAYMENT_PROVIDER", "");
    expect(getPaymentProviderName()).toBe("mock");
  });

  it("PAYMENT_PROVIDER=midtrans + key ada → midtrans", () => {
    vi.stubEnv("PAYMENT_PROVIDER", "midtrans");
    expect(getPaymentProvider().name).toBe("midtrans");
  });

  it("PAYMENT_PROVIDER=midtrans tanpa MIDTRANS_SERVER_KEY → melempar", () => {
    vi.stubEnv("PAYMENT_PROVIDER", "midtrans");
    vi.stubEnv("MIDTRANS_SERVER_KEY", "");
    expect(() => getPaymentProvider()).toThrow(/MIDTRANS_SERVER_KEY/);
  });
});

describe("mockPaymentProvider — bentuk baru", () => {
  it("createPayment mengembalikan qrString + referenceId deterministik", async () => {
    const p = await mockPaymentProvider.createPayment({
      orderId: ORDER_ID,
      grossAmount: 27000,
      expiryMinutes: 15,
    });
    expect(p.referenceId).toBe(`MOCK-${ORDER_ID}`);
    expect(p.qrString).toContain(ORDER_ID);
    expect(p.expiresAt).toBeNull();
  });

  it("handleCallback menurunkan orderId dari referenceId", async () => {
    const r = await mockPaymentProvider.handleCallback({
      referenceId: `MOCK-${ORDER_ID}`,
    });
    expect(r).toEqual({
      referenceId: `MOCK-${ORDER_ID}`,
      orderId: ORDER_ID,
      status: "success",
    });
  });

  it("handleCallback menolak referenceId tanpa prefix MOCK-", async () => {
    expect(
      await mockPaymentProvider.handleCallback({ referenceId: "trx-999" }),
    ).toBeNull();
  });
});
