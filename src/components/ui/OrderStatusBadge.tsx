import {
  ORDER_STATUS_LABEL_ID,
  type OrderStatus,
} from "@/lib/utils/order-status";
import { Badge, type BadgeTone } from "./Badge";

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  menunggu_pembayaran: "warning",
  dibayar: "info",
  diproses: "info",
  siap_diambil: "success",
  selesai: "neutral",
  dibatalkan: "danger",
  kedaluwarsa: "neutral",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]}>{ORDER_STATUS_LABEL_ID[status]}</Badge>
  );
}
