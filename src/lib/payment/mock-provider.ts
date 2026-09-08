import { z } from "zod";
import type { PaymentProvider } from "./types";

const mockCallbackPayloadSchema = z.object({
  referenceId: z.string().min(1),
});

/** `referenceId` mock deterministik: `MOCK-<orderId>`. */
function refFor(orderId: string): string {
  return `MOCK-${orderId}`;
}

function orderIdFromRef(referenceId: string): string | null {
  return referenceId.startsWith("MOCK-")
    ? referenceId.slice("MOCK-".length)
    : null;
}

/**
 * Simulasi Payment Provider — lihat docs/TEKNOLOGI.md#payment-provider--disbursement-provider-abstraction.
 * `qrString` BUKAN QRIS asli (bukan format EMV), cuma teks ringkasan supaya
 * bisa dipindai untuk demo alur — tidak pernah dipakai untuk uang sungguhan.
 * `handleCallback` di sini dipanggil dari tombol "Simulasikan Pembayaran
 * Berhasil" (bukan webhook) — hanya aktif saat `PAYMENT_PROVIDER=mock`.
 */
export const mockPaymentProvider: PaymentProvider = {
  name: "mock",

  async createPayment({ orderId, grossAmount }) {
    const referenceId = refFor(orderId);
    const qrString = [
      "MYGERAI-MOCK-PAYMENT",
      `orderId=${orderId}`,
      `amount=${grossAmount}`,
      `ref=${referenceId}`,
    ].join("|");
    return { referenceId, qrString, expiresAt: null };
  },

  async handleCallback(payload) {
    const parsed = mockCallbackPayloadSchema.safeParse(payload);
    if (!parsed.success) return null;

    const orderId = orderIdFromRef(parsed.data.referenceId);
    if (!orderId) return null;

    return {
      referenceId: parsed.data.referenceId,
      orderId,
      status: "success",
    };
  },
};
