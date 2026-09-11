import { PaymentModeSection } from "@/components/merchant/PaymentModeSection";
import { ServiceFeeInvoiceList } from "@/components/merchant/ServiceFeeInvoiceList";
import { Alert } from "@/components/ui/Alert";
import { getMerchantPaymentSettings } from "@/server/merchants";
import { listMerchantServiceFeeInvoices } from "@/server/service-fee-invoices";

export default async function MerchantPaymentPage() {
  const [settings, invoices] = await Promise.all([
    getMerchantPaymentSettings(),
    listMerchantServiceFeeInvoices(),
  ]);
  if (!settings) return null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-ink">Metode Pembayaran</h2>
      {settings.storefrontLocked ? (
        <Alert tone="error">
          Lapak kamu sedang tidak menerima Pesanan baru karena ada tagihan Biaya
          Layanan yang menunggak. Bayar tagihan di bawah untuk membuka kembali.
        </Alert>
      ) : null}
      <PaymentModeSection settings={settings} />
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-ink">
          Tagihan Biaya Layanan
        </h3>
        <ServiceFeeInvoiceList initialInvoices={invoices} />
      </div>
    </div>
  );
}
