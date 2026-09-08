/**
 * Abstraksi Payment Provider — lihat docs/TEKNOLOGI.md#payment-provider--disbursement-provider-abstraction.
 * `MockPaymentProvider` (dev/unit/E2E test) | `MidtransPaymentProvider` (staging/produksi).
 * Dipilih lewat env `PAYMENT_PROVIDER` via `getPaymentProvider()` (./index.ts).
 */

export type PaymentSettlementStatus =
  | "success"
  | "pending"
  | "expired"
  | "failed";

export interface PaymentProvider {
  readonly name: "mock" | "midtrans";

  /** Buat transaksi pembayaran di gateway. Dipanggil sekali saat `createOrder`. */
  createPayment(input: {
    orderId: string;
    grossAmount: number;
    expiryMinutes: number;
  }): Promise<{
    referenceId: string;
    /** Payload QRIS mentah — dirender jadi gambar oleh pemanggil (lib `qrcode`). */
    qrString: string;
    expiresAt: Date | null;
  }>;

  /**
   * Verifikasi keaslian + parse notifikasi webhook (Midtrans) atau payload
   * simulasi (mock). Mengembalikan `null` kalau keaslian tidak terverifikasi
   * (signature salah) — pemanggil WAJIB memperlakukan itu sebagai penolakan.
   */
  handleCallback(payload: unknown): Promise<{
    referenceId: string;
    orderId: string;
    status: PaymentSettlementStatus;
  } | null>;

  /**
   * Reconcile langsung ke gateway — backstop kalau webhook telat/hilang.
   * `undefined` untuk provider yang tidak mendukung (mock).
   */
  getTransactionStatus?(
    orderId: string,
  ): Promise<{ status: PaymentSettlementStatus } | null>;
}
