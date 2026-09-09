"use server";

import { randomUUID } from "node:crypto";
import { and, eq, gte, inArray } from "drizzle-orm";
import QRCode from "qrcode";
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
import { getPaymentProvider, getPaymentProviderName } from "@/lib/payment";
import {
  midtransIsSandbox,
  midtransQrImageUrl,
} from "@/lib/payment/midtrans-provider";
import { settleOrderPayment } from "@/lib/payment/settle";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit/limiter";
import {
  calculateOrderTotals,
  type OrderCalcItem,
  orderGrandTotal,
} from "@/lib/utils/order-calc";
import { generateOrderCode } from "@/lib/utils/order-code";
import {
  FINAL_ORDER_STATUSES,
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
  MerchantOrderHistoryItem,
  MerchantOrderListItem,
  Order,
  SimulatePaymentResult,
  UpdateOrderStatusResult,
} from "@/types/order";

/** Jumlah maksimum Pesanan yang ditampilkan di Riwayat (skala kaki lima — KISS). */
const MERCHANT_HISTORY_LIMIT = 50;

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
  const ip = await getClientIp();
  if (!checkRateLimit(`create-order:ip:${ip}`, 20, 10 * 60_000)) {
    return {
      ok: false,
      message: "Terlalu banyak permintaan. Silakan coba lagi sebentar lagi.",
    };
  }

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

  const orderItemRows: Array<{
    productId: string;
    productNameSnapshot: string;
    priceSnapshot: number;
    qty: number;
    note: string | null;
  }> = [];
  const calcItems: OrderCalcItem[] = [];

  for (const item of items) {
    const product = productById.get(item.productId);
    if (!product || product.status !== "available") {
      return {
        ok: false,
        message:
          "Salah satu Item sudah tidak tersedia, silakan perbarui Keranjang.",
      };
    }
    if (product.stock !== null && item.qty > product.stock) {
      return {
        ok: false,
        message:
          product.stock === 0
            ? `"${product.name}" sudah habis, silakan perbarui Keranjang.`
            : `Stok "${product.name}" tinggal ${product.stock}.`,
      };
    }
    calcItems.push({ price: product.price, qty: item.qty });
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
  const { subtotal, platformFeeSnapshot, totalForMerchant, grandTotal } =
    calculateOrderTotals(calcItems, platformFeeAmount);
  const expiresAt = new Date(Date.now() + orderExpiryMinutes * 60_000);
  const orderCode = await generateUniqueOrderCode(merchant.id);

  // ID Pesanan dibuat lebih dulu supaya pembayaran di gateway bisa dibuat
  // SEBELUM ada baris DB apa pun — kalau gateway gagal, tidak ada Pesanan
  // "yatim" yang tertinggal.
  const orderId = randomUUID();
  const provider = getPaymentProvider();

  let payment: {
    referenceId: string;
    qrString: string;
    expiresAt: Date | null;
  };
  try {
    payment = await provider.createPayment({
      orderId,
      // Pembeli membayar harga Item + Biaya Layanan (ADR 2026-09-09).
      grossAmount: grandTotal,
      expiryMinutes: orderExpiryMinutes,
    });
  } catch (error) {
    console.error("createPayment gagal:", error);
    return {
      ok: false,
      message: "Gagal menyiapkan pembayaran. Silakan coba lagi.",
    };
  }

  await db.transaction(async (tx) => {
    await tx.insert(orders).values({
      id: orderId,
      merchantId: merchant.id,
      orderCode,
      buyerName,
      status: "menunggu_pembayaran",
      subtotal,
      platformFeeSnapshot,
      totalForMerchant,
      expiresAt,
    });

    await tx
      .insert(orderItems)
      .values(orderItemRows.map((row) => ({ ...row, orderId })));

    await tx.insert(payments).values({
      orderId,
      provider: provider.name,
      referenceId: payment.referenceId,
      grossAmount: grandTotal,
      qrString: payment.qrString,
      status: "pending",
      expiresAt: payment.expiresAt,
    });
  });

  return { ok: true, orderId, orderCode };
}

export async function getOrderStatus(
  orderId: string,
): Promise<BuyerOrderStatusView | null> {
  if (!z.uuid().safeParse(orderId).success) return null;

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
  if (!order) return null;

  let current = await expireOrderIfNeeded(order);

  // Backstop: kalau webhook Midtrans telat/hilang, tanyakan status langsung ke
  // gateway setelah Pesanan berumur >10 dtk (webhook biasanya sudah datang
  // sebelum itu). Mock tidak punya `getTransactionStatus` → dilewati.
  if (
    current.status === "menunggu_pembayaran" &&
    Date.now() - current.createdAt.getTime() > 10_000
  ) {
    const provider = getPaymentProvider();
    const remote = await provider
      .getTransactionStatus?.(orderId)
      .catch(() => null);
    if (remote?.status === "success") {
      await settleOrderPayment(orderId);
      current =
        (await db.query.orders.findFirst({ where: eq(orders.id, orderId) })) ??
        current;
    }
  }

  const [merchant, items, payment] = await Promise.all([
    db.query.merchants.findFirst({
      where: eq(merchants.id, current.merchantId),
    }),
    db.query.orderItems.findMany({ where: eq(orderItems.orderId, current.id) }),
    db.query.payments.findFirst({ where: eq(payments.orderId, current.id) }),
  ]);

  // `qrString` bisa payload EMV (dirender lokal jadi data URI) ATAU URL gambar
  // dari Midtrans (dipakai apa adanya). Mock selalu payload.
  let qrImageUrl: string | null = null;
  if (current.status === "menunggu_pembayaran" && payment?.qrString) {
    qrImageUrl = payment.qrString.startsWith("http")
      ? payment.qrString
      : await QRCode.toDataURL(payment.qrString);
  }

  const sandboxQrUrl =
    current.status === "menunggu_pembayaran" &&
    getPaymentProviderName() === "midtrans" &&
    midtransIsSandbox() &&
    payment?.referenceId
      ? midtransQrImageUrl(payment.referenceId)
      : null;

  return {
    id: current.id,
    orderCode: current.orderCode,
    status: current.status,
    buyerName: current.buyerName,
    stallName: merchant?.stallName ?? "",
    subtotal: current.subtotal,
    platformFeeSnapshot: current.platformFeeSnapshot,
    totalForMerchant: current.totalForMerchant,
    grandTotal: orderGrandTotal(current),
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
    canSimulate:
      getPaymentProviderName() === "mock" &&
      current.status === "menunggu_pembayaran",
    sandboxQrUrl,
  };
}

export async function simulatePaymentSuccess(
  orderId: string,
): Promise<SimulatePaymentResult> {
  if (getPaymentProviderName() !== "mock") {
    return {
      ok: false,
      message: "Simulasi pembayaran hanya tersedia di mode pengujian.",
    };
  }
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

  const callbackResult = await getPaymentProvider().handleCallback({
    referenceId: payment.referenceId,
  });
  if (callbackResult?.status !== "success") {
    return { ok: false, message: "Simulasi pembayaran gagal." };
  }

  await settleOrderPayment(current.id);
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
    // Antrean FIFO: Pesanan terlama (paling lama menunggu) di atas supaya
    // Pedagang mengerjakan sesuai urutan masuk; Pesanan baru menempel di bawah.
    orderBy: (row, { asc }) => [asc(row.createdAt)],
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

/**
 * Riwayat Pesanan milik Lapak sendiri — hanya Pesanan berstatus akhir
 * (`selesai`/`kedaluwarsa`/`dibatalkan`), read-only, terbaru dulu, dibatasi
 * {@link MERCHANT_HISTORY_LIMIT}. Identitas Lapak dari sesi login.
 */
export async function listMerchantOrderHistory(): Promise<
  MerchantOrderHistoryItem[]
> {
  const session = await getMerchantSession();
  if (!session) return [];

  const pastOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.merchantId, session.merchantId),
      inArray(orders.status, [...FINAL_ORDER_STATUSES]),
    ),
    orderBy: (row, { desc }) => [desc(row.createdAt)],
    limit: MERCHANT_HISTORY_LIMIT,
  });
  if (pastOrders.length === 0) return [];

  const orderIds = pastOrders.map((order) => order.id);
  const items = await db.query.orderItems.findMany({
    where: inArray(orderItems.orderId, orderIds),
  });
  const itemsByOrderId = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByOrderId.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrderId.set(item.orderId, list);
  }

  return pastOrders.map((order) => ({
    id: order.id,
    orderCode: order.orderCode,
    status: order.status,
    buyerName: order.buyerName,
    subtotal: order.subtotal,
    platformFeeSnapshot: order.platformFeeSnapshot,
    totalForMerchant: order.totalForMerchant,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    completedAt: order.completedAt,
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
