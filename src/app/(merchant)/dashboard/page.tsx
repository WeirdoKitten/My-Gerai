import { MerchantOrderList } from "@/components/merchant/MerchantOrderList";
import { QrLapakCard } from "@/components/merchant/QrLapakCard";
import { getMerchantQrLapak } from "@/server/merchants";
import { listMerchantOrders } from "@/server/orders";

export default async function MerchantDashboardPage() {
  const [qr, orders] = await Promise.all([
    getMerchantQrLapak(),
    listMerchantOrders(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {qr ? <QrLapakCard qr={qr} /> : null}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Pesanan Masuk</h2>
        <MerchantOrderList initialOrders={orders} />
      </div>
    </div>
  );
}
