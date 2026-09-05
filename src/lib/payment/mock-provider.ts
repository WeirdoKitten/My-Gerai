import QRCode from "qrcode";
import { z } from "zod";
import type { PaymentProvider } from "./types";

const mockCallbackPayloadSchema = z.object({ referenceId: z.string().min(1) });

/**
 * Simulasi Payment Provider — lihat docs/TEKNOLOGI.md#payment-provider-abstraction.
 * `qrImageUrl` BUKAN QRIS asli (bukan format EMV), cuma QR yang bisa dipindai
 * berisi teks ringkasan, untuk kebutuhan demo alur — tidak pernah dipakai
 * untuk transaksi uang sungguhan.
 */
export const mockPaymentProvider: PaymentProvider = {
  async createPayment(order) {
    const referenceId = `MOCK-${order.id}`;
    const payload = [
      "MYGERAI-MOCK-PAYMENT",
      `orderId=${order.id}`,
      `amount=${order.subtotal}`,
      `ref=${referenceId}`,
    ].join("|");
    const qrImageUrl = await QRCode.toDataURL(payload);
    return { qrImageUrl, referenceId };
  },

  async handleCallback(payload) {
    // TripayPaymentProvider (Fase 6) WAJIB verifikasi signature di titik ini
    // sebelum memproses apa pun — lihat docs/RULES.md §7.2.
    const parsed = mockCallbackPayloadSchema.parse(payload);
    return { referenceId: parsed.referenceId, status: "success" };
  },
};
