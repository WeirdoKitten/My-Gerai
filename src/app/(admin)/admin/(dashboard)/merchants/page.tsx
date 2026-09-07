import { MerchantApprovalList } from "@/components/admin/MerchantApprovalList";
import { PageHeader } from "@/components/ui/PageHeader";
import { listMerchantsForAdmin } from "@/server/merchants";

export default async function AdminMerchantsPage() {
  const merchantList = await listMerchantsForAdmin();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Pedagang" />
      <MerchantApprovalList initialMerchants={merchantList} />
    </div>
  );
}
