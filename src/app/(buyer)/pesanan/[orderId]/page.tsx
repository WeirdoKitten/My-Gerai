import { OrderStatusView } from "@/components/buyer/OrderStatusView";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReceiptIcon } from "@/components/ui/icons";
import { getOrderStatus } from "@/server/orders";

export default async function OrderStatusPage(
  props: PageProps<"/pesanan/[orderId]">,
) {
  const { orderId } = await props.params;
  const order = await getOrderStatus(orderId);

  if (!order) {
    return (
      <EmptyState
        icon={<ReceiptIcon className="size-10" />}
        title="Pesanan tidak ditemukan"
        description="Tautan yang kamu buka salah atau Pesanan sudah tidak ada."
      />
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <OrderStatusView initialOrder={order} />
    </div>
  );
}
