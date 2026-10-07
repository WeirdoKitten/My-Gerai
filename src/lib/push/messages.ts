import { type ExpoPushMessage, ORDER_CHANNEL_ID } from "@/lib/push/expo-push";
import { formatRupiah } from "@/lib/utils/money";

/** Isi notifikasi Pesanan lunas. Sengaja tanpa No. HP/alamat Pembeli (terlihat di layar kunci). */
export function buildOrderPaidMessages(
  tokens: string[],
  order: { id: string; orderCode: string; totalForMerchant: number },
): ExpoPushMessage[] {
  return tokens.map((to) => ({
    to,
    title: "Pesanan baru lunas",
    body: `Kode ${order.orderCode} · ${formatRupiah(order.totalForMerchant)}`,
    data: { type: "order_paid", orderId: order.id },
    channelId: ORDER_CHANNEL_ID,
    priority: "high",
    sound: "default",
  }));
}
