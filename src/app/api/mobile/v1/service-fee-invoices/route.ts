import { withMerchant } from "@/lib/mobile-api/handler";
import { apiOk } from "@/lib/mobile-api/respond";
import { listMerchantServiceFeeInvoices } from "@/server/service-fee-invoices";

/** Tagihan Biaya Layanan mingguan (mode QRIS Pribadi), termasuk QR pembayarannya. */
export async function GET(request: Request) {
  return withMerchant(request, async () =>
    apiOk({ invoices: await listMerchantServiceFeeInvoices() }),
  );
}
