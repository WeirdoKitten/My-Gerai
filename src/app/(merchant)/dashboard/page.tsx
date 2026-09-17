import { redirect } from "next/navigation";
import { MerchantOrderList } from "@/components/merchant/MerchantOrderList";
import { OpenToggle } from "@/components/merchant/OpenToggle";
import { getMerchantOpenStatus } from "@/server/merchants";
import { listMerchantOrders } from "@/server/orders";
import { hasAnyProduct } from "@/server/products";

export default async function MerchantDashboardPage() {
  if (!(await hasAnyProduct())) redirect("/dashboard/produk");

  const [orders, openStatus] = await Promise.all([
    listMerchantOrders(),
    getMerchantOpenStatus(),
  ]);

  return (
    <div className="flex flex-col gap-3">
      <OpenToggle initialIsOpen={openStatus?.isOpen ?? true} />
      <h2 className="text-lg font-semibold text-ink">Pesanan Masuk</h2>
      <MerchantOrderList initialOrders={orders} />
    </div>
  );
}
