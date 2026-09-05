"use server";

import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import {
  merchants,
  orderItems,
  orders,
  payments,
  platformConfig,
  products,
} from "@/lib/db/schema";
import { mockPaymentProvider } from "@/lib/payment/mock-provider";
import { generateOrderCode } from "@/lib/utils/order-code";
import {
  isOrderExpired,
  ORDER_STATUS_LABEL_ID,
} from "@/lib/utils/order-status";
import {
  type CreateOrderInput,
  createOrderSchema,
} from "@/lib/validation/checkout.schema";
import type {
  BuyerOrderStatusView,
  CreateOrderResult,
  Order,
  SimulatePaymentResult,
} from "@/types/order";

const DEFAULT_PLATFORM_FEE_AMOUNT = 1000;
const DEFAULT_ORDER_EXPIRY_MINUTES = 15;

/**
 * Nilai `platform_config` aktif saat ini. Kalau tabel belum di-seed sama
 * sekali, pakai default konstanta di atas supaya Pesanan tetap bisa dibuat.
 */
async function getActivePlatformConfig(): Promise<{
  platformFeeAmount: number;
  orderExpiryMinutes: number;
}> {
  const now = new Date();

  const feeRows = await db.query.platformConfig.findMany({
    where: and(
      eq(platformConfig.key, "platform_fee_amount"),
      lte(platformConfig.effectiveFrom, now),
    ),
    orderBy: (row, { desc }) => [desc(row.effectiveFrom)],
    limit: 1,
  });

  const expiryRows = await db.query.platformConfig.findMany({
    where: and(
      eq(platformConfig.key, "order_expiry_minutes"),
      lte(platformConfig.effectiveFrom, now),
    ),
    orderBy: (row, { desc }) => [desc(row.effectiveFrom)],
    limit: 1,
  });

  return {
    platformFeeAmount: feeRows[0]
      ? Number(feeRows[0].value)
      : DEFAULT_PLATFORM_FEE_AMOUNT,
    orderExpiryMinutes: expiryRows[0]
      ? Number(expiryRows[0].value)
      : DEFAULT_ORDER_EXPIRY_MINUTES,
  };
}

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
