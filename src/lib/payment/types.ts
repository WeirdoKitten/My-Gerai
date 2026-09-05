import type { Order } from "@/types/order";

/**
 * Abstraksi Payment Provider — lihat docs/TEKNOLOGI.md#payment-provider-abstraction.
 * Implementasi sekarang: MockPaymentProvider (simulasi). Nanti: TripayPaymentProvider.
 */
export interface PaymentProvider {
  createPayment(
    order: Order,
  ): Promise<{ qrImageUrl: string; referenceId: string }>;
  /** Dipanggil oleh webhook (nyata, Fase 6) ATAU tombol simulasi (mock, sekarang). */
  handleCallback(
    payload: unknown,
  ): Promise<{ referenceId: string; status: "success" | "failed" }>;
}
