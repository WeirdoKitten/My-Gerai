import { MerchantOrderList } from "@/components/merchant/MerchantOrderList";
import { listMerchantOrders } from "@/server/orders";

export default async function MerchantDashboardPage() {
  const orders = await listMerchantOrders();

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Pesanan Masuk</h2>
      <MerchantOrderList initialOrders={orders} />
    </div>
  );
}
