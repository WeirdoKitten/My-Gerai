import { MerchantOrderList } from "@/components/merchant/MerchantOrderList";
import { OpenToggle } from "@/components/merchant/OpenToggle";
import { getMerchantOpenStatus } from "@/server/merchants";
import { listMerchantOrders } from "@/server/orders";

export default async function MerchantDashboardPage() {
  const [orders, openStatus] = await Promise.all([
    listMerchantOrders(),
    getMerchantOpenStatus(),
  ]);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Pesanan Masuk</h2>
      <OpenToggle initialIsOpen={openStatus?.isOpen ?? true} />
      <MerchantOrderList initialOrders={orders} />
    </div>
  );
}
