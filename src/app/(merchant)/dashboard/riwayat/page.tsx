import { MerchantOrderHistoryList } from "@/components/merchant/MerchantOrderHistoryList";
import { listMerchantOrderHistory } from "@/server/orders";

export default async function MerchantOrderHistoryPage() {
  const orders = await listMerchantOrderHistory();

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Riwayat Pesanan</h2>
      <MerchantOrderHistoryList orders={orders} />
    </div>
  );
}
