import { midtransPaymentProvider } from "./midtrans-provider";
import { mockPaymentProvider } from "./mock-provider";
import type { PaymentProvider } from "./types";

/**
 * Pilih Payment Provider dari env `PAYMENT_PROVIDER`:
 *   - `midtrans` → MidtransPaymentProvider (fail-fast kalau `MIDTRANS_SERVER_KEY` kosong)
 *   - selain itu (termasuk kosong) → MockPaymentProvider (dev/unit/E2E test)
 *
 * Tidak di-memoize: overhead-nya cuma baca string + cek, dan test bisa
 * mengubah env antar-kasus tanpa reset modul.
 */
export function getPaymentProvider(): PaymentProvider {
  if (process.env.PAYMENT_PROVIDER === "midtrans") {
    if (!process.env.MIDTRANS_SERVER_KEY) {
      throw new Error(
        "PAYMENT_PROVIDER=midtrans tapi MIDTRANS_SERVER_KEY belum di-set (lihat .env.example).",
      );
    }
    return midtransPaymentProvider;
  }
  return mockPaymentProvider;
}

export function getPaymentProviderName(): PaymentProvider["name"] {
  return getPaymentProvider().name;
}
