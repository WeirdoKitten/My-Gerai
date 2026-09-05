"use server";

import { and, eq, gte, inArray } from "drizzle-orm";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getMerchantSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  merchants,
  orderItems,
  orders,
  payments,
  products,
} from "@/lib/db/schema";
import { mockPaymentProvider } from "@/lib/payment/mock-provider";
import { generateOrderCode } from "@/lib/utils/order-code";
import {
  isOrderExpired,
  nextMerchantStatus,
  ORDER_STATUS_LABEL_ID,
  type OrderStatus,
} from "@/lib/utils/order-status";
import {
  type CreateOrderInput,
  createOrderSchema,
} from "@/lib/validation/checkout.schema";
import { getActivePlatformConfig } from "@/server/config";
import type {
  AdminOrderListItem,
  BuyerOrderStatusView,
  CreateOrderResult,
  MerchantOrderListItem,
  Order,
  SimulatePaymentResult,
  UpdateOrderStatusResult,
} from "@/types/order";

/** Kode Pesanan unik per Lapak per hari (lokal), retry maks 5x kalau tabrakan. */
async function generateUniqueOrderCode(merchantId: string): Promise<string> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateOrderCode();
    const existing = await db.query.orders.findFirst({
      where: and(
        eq(orders.merchantId, merchantId),
        eq(orders.orderCode, code),
        gte(orders.createdAt, startOfDay),
      ),
    });
    if (!existing) return code;
  }
  return generateOrderCode();
}

/**
 * Flip status jadi `kedaluwarsa` kalau sudah lewat `expiresAt` & masih
 * `menunggu_pembayaran` (lazy check, lihat ARSITEKTUR-SISTEM.md). Sengaja
 * TIDAK diekspor — kalau diekspor dari file `"use server"` ini otomatis
 * jadi RPC publik yang bisa dipanggil klien dengan objek `Order` bebas.
 */
async function expireOrderIfNeeded(order: Order): Promise<Order> {
  if (!isOrderExpired(order.status, order.expiresAt)) return order;

  const [updated] = await db
    .update(orders)
    .set({ status: "kedaluwarsa" })
    .where(
      and(eq(orders.id, order.id), eq(orders.status, "menunggu_pembayaran")),
    )
    .returning();

  if (updated) return updated;

  // Kalah race dengan request lain — ambil status terbaru yang sebenarnya.
  const current = await db.query.orders.findFirst({
    where: eq(orders.id, order.id),
  });
  return current ?? order;
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }
  const { merchantSlug, buyerName, items } = parsed.data;

  const merchant = await db.query.merchants.findFirst({
    where: and(
      eq(merchants.slug, merchantSlug),
      eq(merchants.status, "approved"),
    ),
  });
  if (!merchant) {
    return { ok: false, message: "Lapak tidak ditemukan atau belum aktif." };
  }

  const productIds = items.map((item) => item.productId);
  const availableProducts = await db.query.products.findMany({
    where: and(
      eq(products.merchantId, merchant.id),
      inArray(products.id, productIds),
    ),
  });
  const productById = new Map(
    availableProducts.map((product) => [product.id, product]),
  );

  let subtotal = 0;
  const orderItemRows: Array<{
    productId: string;
    productNameSnapshot: string;
    priceSnapshot: number;
    qty: number;
    note: string | null;
  }> = [];

  for (const item of items) {
    const product = productById.get(item.productId);
    if (!product || product.status !== "available") {
      return {
        ok: false,
        message:
          "Salah satu Item sudah tidak tersedia, silakan perbarui Keranjang.",
      };
    }
    subtotal += product.price * item.qty;
    orderItemRows.push({
      productId: product.id,
      productNameSnapshot: product.name,
      priceSnapshot: product.price,
      qty: item.qty,
      note: item.note ?? null,
    });
  }

  const { platformFeeAmount, orderExpiryMinutes } =
    await getActivePlatformConfig();
  const platformFeeSnapshot = platformFeeAmount;
  const totalForMerchant = subtotal - platformFeeSnapshot;
  const expiresAt = new Date(Date.now() + orderExpiryMinutes * 60_000);
  const orderCode = await generateUniqueOrderCode(merchant.id);

  const createdOrder = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        merchantId: merchant.id,
        orderCode,
        buyerName,
        status: "menunggu_pembayaran",
        subtotal,
        platformFeeSnapshot,
        totalForMerchant,
        expiresAt,
      })
      .returning();

    await tx
      .insert(orderItems)
      .values(orderItemRows.map((row) => ({ ...row, orderId: order.id })));

    return order;
  });

  const { referenceId } = await mockPaymentProvider.createPayment(createdOrder);
  await db.insert(payments).values({
    orderId: createdOrder.id,
    provider: "mock",
    referenceId,
    status: "pending",
  });

  return {
    ok: true,
    orderId: createdOrder.id,
    orderCode: createdOrder.orderCode,
  };
}

export async function getOrderStatus(
  orderId: string,
): Promise<BuyerOrderStatusView | null> {
  if (!z.uuid().safeParse(orderId).success) return null;

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
  if (!order) return null;

  const current = await expireOrderIfNeeded(order);

  const [merchant, items] = await Promise.all([
    db.query.merchants.findFirst({
      where: eq(merchants.id, current.merchantId),
    }),
    db.query.orderItems.findMany({ where: eq(orderItems.orderId, current.id) }),
  ]);

  let qrImageUrl: string | null = null;
  if (current.status === "menunggu_pembayaran") {
    qrImageUrl = (await mockPaymentProvider.createPayment(current)).qrImageUrl;
  }

  return {
    id: current.id,
    orderCode: current.orderCode,
    status: current.status,
    buyerName: current.buyerName,
    stallName: merchant?.stallName ?? "",
    subtotal: current.subtotal,
    platformFeeSnapshot: current.platformFeeSnapshot,
    totalForMerchant: current.totalForMerchant,
    createdAt: current.createdAt,
    expiresAt: current.expiresAt,
    paidAt: current.paidAt,
    items: items.map((item) => ({
      id: item.id,
      productNameSnapshot: item.productNameSnapshot,
      priceSnapshot: item.priceSnapshot,
      qty: item.qty,
      note: item.note,
    })),
    qrImageUrl,
  };
}

export async function simulatePaymentSuccess(
  orderId: string,
): Promise<SimulatePaymentResult> {
  if (!z.uuid().safeParse(orderId).success) {
    return { ok: false, message: "Pesanan tidak ditemukan." };
  }

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
  if (!order) {
    return { ok: false, message: "Pesanan tidak ditemukan." };
  }

  const current = await expireOrderIfNeeded(order);

  if (current.status === "dibayar") {
    return { ok: true, message: "Pesanan ini sudah dibayar sebelumnya." };
  }
  if (current.status !== "menunggu_pembayaran") {
    return {
      ok: false,
      message: `Pesanan ini sudah tidak bisa dikonfirmasi (status: ${ORDER_STATUS_LABEL_ID[current.status]}).`,
    };
  }

  const payment = await db.query.payments.findFirst({
    where: eq(payments.orderId, current.id),
  });
  if (!payment) {
    return { ok: false, message: "Data pembayaran tidak ditemukan." };
  }

  const callbackResult = await mockPaymentProvider.handleCallback({
    referenceId: payment.referenceId,
  });
  if (callbackResult.status !== "success") {
    return { ok: false, message: "Simulasi pembayaran gagal." };
  }

  const paidAt = new Date();
  await db
    .update(payments)
    .set({ status: "success", paidAt })
    .where(eq(payments.id, payment.id));
  await db
    .update(orders)
    .set({ status: "dibayar", paidAt })
    .where(
      and(eq(orders.id, current.id), eq(orders.status, "menunggu_pembayaran")),
    );

  return { ok: true };
}

/** Pesanan aktif (butuh aksi Pedagang) milik Lapak sendiri — identitas dari sesi login. */
export async function listMerchantOrders(): Promise<MerchantOrderListItem[]> {
  const session = await getMerchantSession();
  if (!session) return [];

  const activeOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.merchantId, session.merchantId),
      inArray(orders.status, ["dibayar", "diproses", "siap_diambil"]),
    ),
    orderBy: (row, { desc }) => [desc(row.createdAt)],
  });
  if (activeOrders.length === 0) return [];

  const orderIds = activeOrders.map((order) => order.id);
  const items = await db.query.orderItems.findMany({
    where: inArray(orderItems.orderId, orderIds),
  });
  const itemsByOrderId = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByOrderId.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrderId.set(item.orderId, list);
  }

  return activeOrders.map((order) => ({
    id: order.id,
    orderCode: order.orderCode,
    status: order.status,
    buyerName: order.buyerName,
    buyerNote: order.buyerNote,
    createdAt: order.createdAt,
    items: (itemsByOrderId.get(order.id) ?? []).map((item) => ({
      id: item.id,
      productNameSnapshot: item.productNameSnapshot,
      priceSnapshot: item.priceSnapshot,
      qty: item.qty,
      note: item.note,
    })),
  }));
}

export async function updateOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
): Promise<UpdateOrderStatusResult> {
  if (!z.uuid().safeParse(orderId).success) {
    return { ok: false, message: "Pesanan tidak ditemukan." };
  }
  const session = await getMerchantSession();
  if (!session) {
    return { ok: false, message: "Sesi berakhir, silakan login kembali." };
  }

  // Sengaja TIDAK menerima merchantId dari parameter — identitas Pedagang
  // selalu dari sesi, dan filter kepemilikan ada di klausa WHERE query di
  // bawah, bukan cuma dicek di JS setelah fetch bebas (docs/DATA-MODEL.md
  // §Keamanan Multi-tenant).
  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, orderId),
      eq(orders.merchantId, session.merchantId),
    ),
  });
  if (!order) {
    // Sama pesannya untuk "tidak ada" maupun "milik Lapak lain" — jangan
    // bocorkan keberadaan Pesanan Lapak lain.
    return { ok: false, message: "Pesanan tidak ditemukan." };
  }

  if (nextMerchantStatus(order.status) !== nextStatus) {
    return { ok: false, message: "Perubahan status tidak valid." };
  }

  const [updated] = await db
    .update(orders)
    .set({
      status: nextStatus,
      ...(nextStatus === "selesai" ? { completedAt: new Date() } : {}),
    })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.merchantId, session.merchantId),
        eq(orders.status, order.status), // optimistic lock, cegah race klik ganda
      ),
    )
    .returning();

  if (!updated) {
    return {
      ok: false,
      message: "Status Pesanan sudah berubah, silakan refresh.",
    };
  }
  return { ok: true };
}

/** Daftar Pesanan lintas-Lapak untuk Admin (Daftar Transaksi) — otorisasi via sesi Admin. */
export async function listOrdersForAdmin(): Promise<AdminOrderListItem[]> {
  const session = await getAdminSession();
  if (!session) return [];

  const allOrders = await db.query.orders.findMany({
    orderBy: (row, { desc }) => [desc(row.createdAt)],
  });
  if (allOrders.length === 0) return [];

  const merchantIds = [...new Set(allOrders.map((order) => order.merchantId))];
  const merchantRows = await db.query.merchants.findMany({
    where: inArray(merchants.id, merchantIds),
  });
  const stallNameById = new Map(merchantRows.map((m) => [m.id, m.stallName]));

  return allOrders.map((order) => ({
    id: order.id,
    orderCode: order.orderCode,
    stallName: stallNameById.get(order.merchantId) ?? "",
    buyerName: order.buyerName,
    status: order.status,
    subtotal: order.subtotal,
    platformFeeSnapshot: order.platformFeeSnapshot,
    totalForMerchant: order.totalForMerchant,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
  }));
}
