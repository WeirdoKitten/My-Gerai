import { ServiceFeeInvoiceManager } from "@/components/admin/ServiceFeeInvoiceManager";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  listQrisPribadiMerchantAccruals,
  listServiceFeeInvoicesForAdmin,
} from "@/server/service-fee-invoices";

export default async function AdminInvoicesPage() {
  const [accruals, invoices] = await Promise.all([
    listQrisPribadiMerchantAccruals(),
    listServiceFeeInvoicesForAdmin(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Tagihan" />
      <ServiceFeeInvoiceManager
        initialAccruals={accruals}
        initialInvoices={invoices}
      />
    </div>
  );
}
