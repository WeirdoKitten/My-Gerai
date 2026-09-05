import { MerchantApprovalList } from "@/components/admin/MerchantApprovalList";
import { listMerchantsForAdmin } from "@/server/merchants";

export default async function AdminMerchantsPage() {
  const merchantList = await listMerchantsForAdmin();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Pedagang
      </h1>
      <MerchantApprovalList initialMerchants={merchantList} />
    </div>
  );
}
