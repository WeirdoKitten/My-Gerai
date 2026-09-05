import { OrderStatusView } from "@/components/buyer/OrderStatusView";
import { getOrderStatus } from "@/server/orders";

export default async function OrderStatusPage(
  props: PageProps<"/pesanan/[orderId]">,
) {
  const { orderId } = await props.params;
  const order = await getOrderStatus(orderId);

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Pesanan Tidak Ditemukan
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Tautan yang kamu buka salah atau Pesanan sudah tidak ada.
        </p>
      </div>
    );
  }

  return <OrderStatusView initialOrder={order} />;
}
