import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { merchantPushTokens, orders } from "@/lib/db/schema";
import { sendExpoPush } from "@/lib/push/expo-push";
import { buildOrderPaidMessages } from "@/lib/push/messages";

/*
 * Push notification ke aplikasi Android Pedagang (Fase 12a). Provider dipilih
 * lewat env `PUSH_PROVIDER`: `expo` (staging/produksi) atau `log` (default,
 * dev/test — hanya mencetak ke log, tidak memanggil jaringan).
 */

/** Beri tahu semua HP Pedagang pemilik Pesanan. Dipanggil sekali per transisi ke `dibayar`. */
export async function notifyMerchantOrderPaid(orderId: string): Promise<void> {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    columns: {
      id: true,
      merchantId: true,
      orderCode: true,
      totalForMerchant: true,
    },
  });
  if (!order) return;

  const rows = await db.query.merchantPushTokens.findMany({
    where: eq(merchantPushTokens.merchantId, order.merchantId),
    columns: { token: true },
  });
  if (rows.length === 0) return;

  const messages = buildOrderPaidMessages(
    rows.map((row) => row.token),
    order,
  );

  if (process.env.PUSH_PROVIDER !== "expo") {
    console.log(
      `[push:log] order_paid ${order.orderCode} → ${messages.length} perangkat`,
    );
    return;
  }

  const { invalidTokens } = await sendExpoPush(messages, {
    accessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
  });
  if (invalidTokens.length > 0) {
    await db
      .delete(merchantPushTokens)
      .where(inArray(merchantPushTokens.token, invalidTokens));
  }
}
