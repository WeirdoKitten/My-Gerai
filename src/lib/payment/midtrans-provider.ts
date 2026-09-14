import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { PaymentProvider, PaymentSettlementStatus } from "./types";

/**
 * MidtransPaymentProvider — Core API QRIS.
 * Docs: https://docs.midtrans.com/reference/qris + /docs/https-notification-webhooks.
 * Semua kredensial dari env; hanya dipakai di kode server. Lihat
 * docs/TEKNOLOGI.md#payment-provider--disbursement-provider-abstraction.
 */

const CHARGE_TIMEOUT_MS = 10_000;

function serverKey(): string {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) {
    throw new Error(
      "MIDTRANS_SERVER_KEY belum di-set (dibutuhkan saat PAYMENT_PROVIDER=midtrans).",
    );
  }
  return key;
}

function baseUrl(): string {
  return process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${serverKey()}:`).toString("base64")}`;
}

/** True kalau sedang pakai kredensial sandbox (bukan produksi). */
export function midtransIsSandbox(): boolean {
  return process.env.MIDTRANS_IS_PRODUCTION !== "true";
}

/**
 * URL gambar QR di sisi Midtrans (endpoint `generate-qr-code`). Formatnya
 * deterministik dari `transaction_id`. Dipakai HANYA sebagai bantuan uji di
 * sandbox — halaman status Pesanan menampilkannya supaya bisa ditempel ke
 * simulator QRIS Midtrans (`simulator.sandbox.midtrans.com/v2/qris`).
 */
export function midtransQrImageUrl(transactionId: string): string {
  return `${baseUrl()}/v2/qris/${transactionId}/qr-code`;
}

/** Peta status transaksi Midtrans → status internal. */
function mapStatus(
  transactionStatus: string,
  fraudStatus: string | undefined,
): PaymentSettlementStatus {
  switch (transactionStatus) {
    case "settlement":
      return "success";
    case "capture":
      return fraudStatus === "challenge" ? "pending" : "success";
    case "pending":
      return "pending";
    case "expire":
      return "expired";
    default:
      // deny, cancel, refund, partial_refund, failure, dll.
      return "failed";
  }
}

const chargeResponseSchema = z.object({
  transaction_id: z.string().min(1),
  transaction_status: z.string(),
  // `qr_string` ada di sebagian versi respons; kalau tidak, pakai `actions`.
  qr_string: z.string().min(1).optional(),
  actions: z
    .array(z.object({ name: z.string(), url: z.string().min(1) }))
    .optional(),
  status_code: z.string().optional(),
  status_message: z.string().optional(),
});

const notificationSchema = z.object({
  order_id: z.string().min(1),
  transaction_id: z.string().min(1),
  status_code: z.string().min(1),
  gross_amount: z.string().min(1),
  signature_key: z.string().min(1),
  transaction_status: z.string().min(1),
  fraud_status: z.string().optional(),
});

const statusResponseSchema = z.object({
  transaction_status: z.string(),
  fraud_status: z.string().optional(),
});

/** Bandingkan dua hex string secara aman dari timing attack. */
function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

/**
 * Verifikasi + parse notifikasi Midtrans (dipakai bersama oleh webhook
 * Pesanan Pembeli dan webhook tagihan Biaya Layanan — lihat
 * src/app/api/webhooks/payment/route.ts). `rawOrderId` BELUM tentu UUID
 * Pesanan — bisa juga `svcfee-<uuid tagihan>`, pemanggil yang menentukan
 * artinya lewat prefix.
 */
export function verifyMidtransNotification(payload: unknown): {
  referenceId: string;
  rawOrderId: string;
  status: PaymentSettlementStatus;
} | null {
  const parsed = notificationSchema.safeParse(payload);
  if (!parsed.success) return null;

  const { order_id, status_code, gross_amount, signature_key } = parsed.data;
  const expected = createHash("sha512")
    .update(`${order_id}${status_code}${gross_amount}${serverKey()}`)
    .digest("hex");

  if (!safeEqualHex(expected, signature_key.toLowerCase())) return null;

  return {
    referenceId: parsed.data.transaction_id,
    rawOrderId: order_id,
    status: mapStatus(parsed.data.transaction_status, parsed.data.fraud_status),
  };
}

/**
 * Charge QRIS untuk tagihan Biaya Layanan mingguan (Pedagang → Aplikator) —
 * bukan Pesanan Pembeli, jadi dipisah dari `PaymentProvider.createPayment`.
 * `order_id` dikirim dengan prefix `svcfee-` supaya webhook bisa membedakan
 * dari Pesanan biasa (lihat verifyMidtransNotification). Return `null` kalau
 * gagal (dicatat & dicoba lagi di run cron berikutnya, bukan melempar error
 * yang menghentikan seluruh batch).
 */
export async function createServiceFeeInvoiceCharge(
  invoiceId: string,
  amount: number,
): Promise<{ referenceId: string; qrString: string } | null> {
  const response = await fetch(`${baseUrl()}/v2/charge`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      payment_type: "qris",
      transaction_details: {
        order_id: `svcfee-${invoiceId}`,
        gross_amount: amount,
      },
      qris: { acquirer: "gopay" },
    }),
    signal: AbortSignal.timeout(CHARGE_TIMEOUT_MS),
  });

  const json: unknown = await response.json().catch(() => null);
  const parsed = chargeResponseSchema.safeParse(json);
  const qrSource =
    (parsed.success ? parsed.data.qr_string : undefined) ??
    (parsed.success
      ? parsed.data.actions?.find((a) => a.name === "generate-qr-code")?.url
      : undefined);

  if (!response.ok || !parsed.success || !qrSource) return null;

  return { referenceId: parsed.data.transaction_id, qrString: qrSource };
}

export const midtransPaymentProvider: PaymentProvider = {
  name: "midtrans",

  async createPayment({ orderId, grossAmount, expiryMinutes }) {
    const response = await fetch(`${baseUrl()}/v2/charge`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
      body: JSON.stringify({
        payment_type: "qris",
        transaction_details: { order_id: orderId, gross_amount: grossAmount },
        qris: { acquirer: "gopay" },
        custom_expiry: {
          expiry_duration: expiryMinutes,
          unit: "minute",
        },
      }),
      signal: AbortSignal.timeout(CHARGE_TIMEOUT_MS),
    });

    const json: unknown = await response.json().catch(() => null);
    const parsed = chargeResponseSchema.safeParse(json);

    // Sumber QR: `qr_string` (payload EMV, dirender lokal) kalau ada; kalau
    // tidak, URL gambar `generate-qr-code` dari `actions` (dipakai apa adanya
    // sebagai `<img src>`). Salah satunya WAJIB ada.
    const qrSource =
      (parsed.success ? parsed.data.qr_string : undefined) ??
      (parsed.success
        ? parsed.data.actions?.find((a) => a.name === "generate-qr-code")?.url
        : undefined);

    if (!response.ok || !parsed.success || !qrSource) {
      const detail =
        parsed.success && parsed.data.status_message
          ? parsed.data.status_message
          : `HTTP ${response.status}`;
      throw new Error(`Midtrans charge gagal: ${detail}`);
    }

    return {
      referenceId: parsed.data.transaction_id,
      qrString: qrSource,
      // Pakai durasi yang kita minta sendiri (custom_expiry) — hindari
      // parsing format tanggal Midtrans yang tidak ISO.
      expiresAt: new Date(Date.now() + expiryMinutes * 60_000),
    };
  },

  async handleCallback(payload) {
    const result = verifyMidtransNotification(payload);
    if (!result) return null;
    return {
      referenceId: result.referenceId,
      orderId: result.rawOrderId,
      status: result.status,
    };
  },

  async getTransactionStatus(orderId) {
    const response = await fetch(
      `${baseUrl()}/v2/${encodeURIComponent(orderId)}/status`,
      {
        headers: { Accept: "application/json", Authorization: authHeader() },
        signal: AbortSignal.timeout(CHARGE_TIMEOUT_MS),
      },
    );

    if (!response.ok) return null;
    const parsed = statusResponseSchema.safeParse(
      await response.json().catch(() => null),
    );
    if (!parsed.success) return null;

    return {
      status: mapStatus(
        parsed.data.transaction_status,
        parsed.data.fraud_status,
      ),
    };
  },
};
