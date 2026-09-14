import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orderItems, orders, payments, products } from "@/lib/db/schema";

/**
 * Terapkan pembayaran sukses ke sebuah Pesanan: `payments` → sukses, transisi
 * `menunggu_pembayaran → dibayar` (guard di WHERE cegah dobel), lalu kurangi
 * stok Item yang dibatasi. Dipanggil dari webhook Midtrans DAN dari
 * `simulatePaymentSuccess` (mock). Idempoten.
 *
 * BUKAN Server Action (`"use server"`) — sengaja di modul biasa supaya tidak
 * jadi RPC publik yang bisa "menandai lunas" Pesanan mana pun tanpa bayar.
 */
export async function settleOrderPayment(orderId: string): Promise<void> {
  const paidAt = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(payments)
      .set({ status: "success", paidAt })
      .where(eq(payments.orderId, orderId));

    const [paidOrder] = await tx
      .update(orders)
      .set({ status: "dibayar", paidAt })
      .where(
        and(eq(orders.id, orderId), eq(orders.status, "menunggu_pembayaran")),
      )
      .returning({ id: orders.id, merchantId: orders.merchantId });

    if (!paidOrder) return;

    const lines = await tx.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId),
      columns: { productId: true, qty: true },
    });
    for (const line of lines) {
      await tx
        .update(products)
        .set({ stock: sql`GREATEST(${products.stock} - ${line.qty}, 0)` })
        .where(
          and(
            eq(products.id, line.productId),
            eq(products.merchantId, paidOrder.merchantId),
            // Hanya Item yang stoknya dibatasi.
            sql`${products.stock} IS NOT NULL`,
          ),
        );
    }
  });
}

/** Tandai `payments` sebagai gagal/kedaluwarsa (dari notifikasi gateway). */
export async function markPaymentTerminal(
  orderId: string,
  status: "failed" | "expired",
): Promise<void> {
  await db
    .update(payments)
    .set({ status })
    .where(and(eq(payments.orderId, orderId), eq(payments.status, "pending")));
}
