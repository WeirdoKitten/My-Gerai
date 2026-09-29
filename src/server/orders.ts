"use server";

import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import QRCode from "qrcode";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getMerchantSession } from "@/lib/auth/session";
import { isMerchantOrderingLocked } from "@/lib/billing/service-fee";
import { db } from "@/lib/db/client";
import {
  merchants,
  orderItems,
  orderItemVariantSelections,
  orders,
  payments,
  products,
  productVariantGroups,
  productVariantOptions,
} from "@/lib/db/schema";
import { getPaymentProvider, getPaymentProviderName } from "@/lib/payment";
import {
  midtransIsSandbox,
  midtransQrImageUrl,
} from "@/lib/payment/midtrans-provider";
import { settleOrderPayment } from "@/lib/payment/settle";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit/limiter";
import { getMerchantOpenState } from "@/lib/schedule/is-merchant-open";
import { formatDistanceKm, haversineDistanceKm } from "@/lib/utils/geo";
import {
  calculateOrderTotals,
  type OrderCalcItem,
  orderAmountToPay,
  orderGrandTotal,
} from "@/lib/utils/order-calc";
import { generateOrderCode } from "@/lib/utils/order-code";
import {
  type DeliveryFailureReason,
  FINAL_ORDER_STATUSES,
  isOrderExpired,
  minutesUntilDeliveryFailAllowed,
  nextMerchantStatus,
  ORDER_STATUS_LABEL_ID,
  type OrderStatus,
  PAID_ORDER_STATUSES,
} from "@/lib/utils/order-status";
import {
  type CreateOrderInput,
  createOrderSchema,
  trackOrderSchema,
} from "@/lib/validation/checkout.schema";
import { getActivePlatformConfig } from "@/server/config";
import type {
  AdminOrderListItem,
  BuyerOrderStatusView,
  CreateOrderResult,
  GetOrderReceiptResult,
  MerchantOrderDeliveryView,
  MerchantOrderHistoryItem,
  MerchantOrderListResult,
  Order,
  SimulatePaymentResult,
  TrackOrderResult,
  UpdateOrderStatusResult,
} from "@/types/order";

/** Jumlah maksimum Pesanan yang ditampilkan di Riwayat (skala kaki lima — KISS). */
const MERCHANT_HISTORY_LIMIT = 50;

/**
 * Jumlah maksimum Pesanan aktif yang ditampilkan sekaligus di dashboard
 * (`/dashboard`) — mencegah dashboard berat (query + render + polling 5 detik)
 * kalau Pesanan aktif menumpuk. Diurut FIFO, jadi yang tampil selalu yang
 * paling lama menunggu & paling perlu dikerjakan duluan.
 */
const ACTIVE_ORDER_LIST_LIMIT = 100;

/**
 * Kode Pesanan unik GLOBAL (dipakai Lacak Pesanan), retry maks 5x kalau
 * tabrakan. Unique index parsial `orders_order_code_v2_idx` jadi pengaman
 * terakhir kalau dua request kebetulan dapat kode sama bersamaan.
 */
async function generateUniqueOrderCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateOrderCode();
    const existing = await db.query.orders.findFirst({
      where: eq(orders.orderCode, code),
      columns: { id: true },
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

type OrderVariantGroup = {
  id: string;
  name: string;
  options: Array<{ id: string; name: string; priceDelta: number }>;
};

/** Batch-fetch grup+opsi varian sejumlah Item sekaligus, dipakai validasi & snapshot harga di `createOrder`. */
async function fetchVariantGroupsForOrder(
  productIds: string[],
): Promise<Map<string, OrderVariantGroup[]>> {
  if (productIds.length === 0) return new Map();

  const groups = await db.query.productVariantGroups.findMany({
    where: inArray(productVariantGroups.productId, productIds),
    orderBy: [asc(productVariantGroups.sortOrder)],
  });
  if (groups.length === 0) return new Map();

  const groupIds = groups.map((group) => group.id);
  const options = await db.query.productVariantOptions.findMany({
    where: inArray(productVariantOptions.groupId, groupIds),
  });
  const optionsByGroupId = new Map<string, typeof options>();
  for (const option of options) {
    const list = optionsByGroupId.get(option.groupId) ?? [];
    list.push(option);
    optionsByGroupId.set(option.groupId, list);
  }

  const groupsByProductId = new Map<string, OrderVariantGroup[]>();
  for (const group of groups) {
    const list = groupsByProductId.get(group.productId) ?? [];
    list.push({
      id: group.id,
      name: group.name,
      options: (optionsByGroupId.get(group.id) ?? []).map((option) => ({
        id: option.id,
        name: option.name,
        priceDelta: option.priceDelta,
      })),
    });
    groupsByProductId.set(group.productId, list);
  }
  return groupsByProductId;
}

/**
 * Info antar untuk Pedagang pemilik Pesanan. Pemanggil WAJIB sudah memfilter
 * kepemilikan lewat sesi — isinya data pribadi Pembeli (HP, alamat, pin).
 */
function toMerchantDeliveryView(
  order: Order,
): MerchantOrderDeliveryView | null {
  if (
    order.fulfillmentMethod !== "antar" ||
    order.buyerPhone === null ||
    order.deliveryLatitude === null ||
    order.deliveryLongitude === null
  ) {
    return null;
  }
  return {
    buyerPhone: order.buyerPhone,
    address: order.deliveryAddress ?? "",
    landmark: order.deliveryLandmark,
    latitude: order.deliveryLatitude,
    longitude: order.deliveryLongitude,
    distanceKm: order.deliveryDistanceKm,
    startedAt: order.deliveryStartedAt,
    failureReason: order.deliveryFailureReason,
    failureNote: order.deliveryFailureNote,
  };
}

type OrderItemVariantSelection = {
  groupNameSnapshot: string;
  optionNameSnapshot: string;
  priceDeltaSnapshot: number;
};

/** Batch-fetch snapshot pilihan varian sejumlah baris order_items sekaligus. */
async function fetchVariantSelectionsByOrderItemId(
  orderItemIds: string[],
): Promise<Map<string, OrderItemVariantSelection[]>> {
  if (orderItemIds.length === 0) return new Map();

  const selections = await db.query.orderItemVariantSelections.findMany({
    where: inArray(orderItemVariantSelections.orderItemId, orderItemIds),
    orderBy: [asc(orderItemVariantSelections.sortOrder)],
  });

  const selectionsByOrderItemId = new Map<
    string,
    OrderItemVariantSelection[]
  >();
  for (const selection of selections) {
    const list = selectionsByOrderItemId.get(selection.orderItemId) ?? [];
    list.push({
      groupNameSnapshot: selection.groupNameSnapshot,
      optionNameSnapshot: selection.optionNameSnapshot,
      priceDeltaSnapshot: selection.priceDeltaSnapshot,
    });
    selectionsByOrderItemId.set(selection.orderItemId, list);
  }
  return selectionsByOrderItemId;
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
  const checkout = parsed.data;
  const { merchantSlug, buyerName, items } = checkout;

  const merchant = await db.query.merchants.findFirst({
    where: and(
      eq(merchants.slug, merchantSlug),
      eq(merchants.status, "approved"),
    ),
  });
  if (!merchant) {
    return { ok: false, message: "Lapak tidak ditemukan atau belum aktif." };
  }

  const { platformFeeAmount, orderExpiryMinutes, serviceFeeGracePeriodDays } =
    await getActivePlatformConfig();

  // Defense-in-depth: `getStallCatalog` (halaman menu) sudah menolak Lapak
  // yang terkunci, tapi cek ulang di sini supaya menu yang ke-cache stale
  // tidak bisa lolos submit Pesanan (lihat isMerchantOrderingLocked).
  if (await isMerchantOrderingLocked(merchant.id, serviceFeeGracePeriodDays)) {
    return {
      ok: false,
      message:
        "Lapak sedang tidak menerima pesanan baru (tagihan Biaya Layanan belum lunas).",
    };
  }

  // Defense-in-depth sama seperti cek lock di atas: halaman menu yang
  // ke-cache stale (atau CheckoutGate yang belum sempat termuat) tidak
  // boleh lolos submit Pesanan saat Lapak sedang tutup.
  const { isOpen } = await getMerchantOpenState(merchant.id);
  if (!isOpen) {
    return { ok: false, message: "Lapak sedang tutup, coba lagi nanti." };
  }

  // Pesanan Antar (Fase 11): Ongkir & jarak SELALU dihitung di sini dari
  // pengaturan Lapak + koordinat — tidak ada field harga/ongkir dari klien.
  let delivery: {
    buyerPhone: string;
    deliveryAddress: string;
    deliveryLandmark: string | null;
    deliveryLatitude: number;
    deliveryLongitude: number;
    deliveryDistanceKm: number;
    deliveryFee: number;
  } | null = null;
  if (checkout.fulfillmentMethod === "antar") {
    if (
      !merchant.deliveryEnabled ||
      merchant.deliveryFee === null ||
      merchant.latitude === null ||
      merchant.longitude === null
    ) {
      return {
        ok: false,
        message: "Lapak ini sedang tidak menerima pesanan antar.",
      };
    }
    const distanceKm = haversineDistanceKm(
      { latitude: merchant.latitude, longitude: merchant.longitude },
      {
        latitude: checkout.deliveryLatitude,
        longitude: checkout.deliveryLongitude,
      },
    );
    if (distanceKm > merchant.deliveryRadiusKm) {
      return {
        ok: false,
        message: `Alamat di luar jangkauan antar Lapak (maks. ${formatDistanceKm(merchant.deliveryRadiusKm)}).`,
      };
    }
    delivery = {
      buyerPhone: checkout.buyerPhone,
      deliveryAddress: checkout.deliveryAddress,
      deliveryLandmark: checkout.deliveryLandmark || null,
      deliveryLatitude: checkout.deliveryLatitude,
      deliveryLongitude: checkout.deliveryLongitude,
      deliveryDistanceKm: distanceKm,
      deliveryFee: merchant.deliveryFee,
    };
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
  const variantGroupsByProductId = await fetchVariantGroupsForOrder(productIds);

  const orderItemRows: Array<{
    id: string;
    productId: string;
    productNameSnapshot: string;
    priceSnapshot: number;
    costPriceSnapshot: number | null;
    qty: number;
    note: string | null;
  }> = [];
  const variantSelectionRows: Array<{
    orderItemId: string;
    groupNameSnapshot: string;
    optionNameSnapshot: string;
    priceDeltaSnapshot: number;
    sortOrder: number;
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

    // Varian: kalau Item punya grup varian, Pembeli wajib pilih tepat satu
    // opsi valid per grup — tidak lebih (grup asing/dobel), tidak kurang
    // (grup belum dijawab). Kategori error sama seperti produk tidak
    // tersedia di atas: race antara Pedagang mengubah varian & Pembeli checkout.
    const groups = variantGroupsByProductId.get(product.id) ?? [];
    const selectedOptionIdByGroupId = new Map(
      item.variantSelections.map((s) => [s.groupId, s.optionId]),
    );
    const itemVariantSnapshots: Array<{
      groupNameSnapshot: string;
      optionNameSnapshot: string;
      priceDeltaSnapshot: number;
    }> = [];
    let variantPriceDelta = 0;
    for (const group of groups) {
      const optionId = selectedOptionIdByGroupId.get(group.id);
      const option = optionId
        ? group.options.find((o) => o.id === optionId)
        : undefined;
      if (!option) {
        return {
          ok: false,
          message: `Pilih ${group.name} untuk "${product.name}".`,
        };
      }
      variantPriceDelta += option.priceDelta;
      itemVariantSnapshots.push({
        groupNameSnapshot: group.name,
        optionNameSnapshot: option.name,
        priceDeltaSnapshot: option.priceDelta,
      });
    }
    if (selectedOptionIdByGroupId.size !== groups.length) {
      return {
        ok: false,
        message: `Pilihan varian tidak valid untuk "${product.name}", silakan perbarui Keranjang.`,
      };
    }

    const effectiveUnitPrice = product.price + variantPriceDelta;
    const orderItemId = randomUUID();
    calcItems.push({ price: effectiveUnitPrice, qty: item.qty });
    orderItemRows.push({
      id: orderItemId,
      productId: product.id,
      productNameSnapshot: product.name,
      priceSnapshot: effectiveUnitPrice,
      costPriceSnapshot: product.costPrice,
      qty: item.qty,
      note: item.note ?? null,
    });
    itemVariantSnapshots.forEach((snapshot, sortOrder) => {
      variantSelectionRows.push({ orderItemId, sortOrder, ...snapshot });
    });
  }

  const {
    subtotal,
    platformFeeSnapshot,
    deliveryFeeSnapshot,
    totalForMerchant,
    grandTotal,
  } = calculateOrderTotals(
    calcItems,
    platformFeeAmount,
    delivery?.deliveryFee ?? 0,
  );
  const amountForQrisPribadi = orderAmountToPay(
    { subtotal, platformFeeSnapshot, deliveryFeeSnapshot },
    true,
  );
  const expiresAt = new Date(Date.now() + orderExpiryMinutes * 60_000);
  const orderCode = await generateUniqueOrderCode();

  // ID Pesanan dibuat lebih dulu supaya pembayaran di gateway bisa dibuat
  // SEBELUM ada baris DB apa pun — kalau gateway gagal, tidak ada Pesanan
  // "yatim" yang tertinggal.
  const orderId = randomUUID();

  let paymentRow: {
    provider: "mock" | "midtrans" | "qris_pribadi";
    referenceId: string;
    grossAmount: number;
    qrString: string | null;
    expiresAt: Date | null;
  };

  if (merchant.paymentMode === "qris_pribadi") {
    // Tidak ada panggilan gateway sama sekali — Pembeli bayar LANGSUNG ke
    // QRIS statis milik Pedagang, sebesar `subtotal + Ongkir` (Biaya Layanan
    // ditagih belakangan lewat tagihan mingguan, lihat src/lib/billing/).
    paymentRow = {
      provider: "qris_pribadi",
      referenceId: orderId, // tidak ada referensi eksternal gateway
      grossAmount: amountForQrisPribadi,
      qrString: null, // dirender dari merchant.qrisPhotoUrl saat baca (getOrderStatus)
      expiresAt,
    };
  } else {
    const provider = getPaymentProvider();
    try {
      const payment = await provider.createPayment({
        orderId,
        // Pembeli membayar harga Item + Biaya Layanan (ADR 2026-09-09)
        // + Ongkir untuk Pesanan Antar (ADR 2026-09-28).
        grossAmount: grandTotal,
        expiryMinutes: orderExpiryMinutes,
      });
      paymentRow = {
        provider: provider.name,
        referenceId: payment.referenceId,
        grossAmount: grandTotal,
        qrString: payment.qrString,
        expiresAt: payment.expiresAt,
      };
    } catch (error) {
      console.error("createPayment gagal:", error);
      return {
        ok: false,
        message: "Gagal menyiapkan pembayaran. Silakan coba lagi.",
      };
    }
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
      fulfillmentMethod: checkout.fulfillmentMethod,
      deliveryFeeSnapshot,
      ...(delivery
        ? {
            buyerPhone: delivery.buyerPhone,
            deliveryAddress: delivery.deliveryAddress,
            deliveryLandmark: delivery.deliveryLandmark,
            deliveryLatitude: delivery.deliveryLatitude,
            deliveryLongitude: delivery.deliveryLongitude,
            deliveryDistanceKm: delivery.deliveryDistanceKm,
          }
        : {}),
    });

    await tx
      .insert(orderItems)
      .values(orderItemRows.map((row) => ({ ...row, orderId })));

    if (variantSelectionRows.length > 0) {
      await tx.insert(orderItemVariantSelections).values(variantSelectionRows);
    }

    await tx.insert(payments).values({
      orderId,
      provider: paymentRow.provider,
      referenceId: paymentRow.referenceId,
      grossAmount: paymentRow.grossAmount,
      qrString: paymentRow.qrString,
      status: "pending",
      expiresAt: paymentRow.expiresAt,
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

  const payment = await db.query.payments.findFirst({
    where: eq(payments.orderId, current.id),
  });
  const isQrisPribadi = payment?.provider === "qris_pribadi";

  // Backstop: kalau webhook Midtrans telat/hilang, tanyakan status langsung ke
  // gateway setelah Pesanan berumur >10 dtk (webhook biasanya sudah datang
  // sebelum itu). Mock tidak punya `getTransactionStatus` → dilewati. QRIS
  // pribadi tidak punya transaksi gateway sama sekali → dilewati juga.
  if (
    current.status === "menunggu_pembayaran" &&
    !isQrisPribadi &&
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

  const [merchant, items] = await Promise.all([
    db.query.merchants.findFirst({
      where: eq(merchants.id, current.merchantId),
    }),
    db.query.orderItems.findMany({ where: eq(orderItems.orderId, current.id) }),
  ]);
  const variantSelectionsByOrderItemId =
    await fetchVariantSelectionsByOrderItemId(items.map((item) => item.id));

  // `qrString` bisa payload EMV (dirender lokal jadi data URI) ATAU URL gambar
  // dari Midtrans (dipakai apa adanya). Mock selalu payload. QRIS pribadi
  // dirender dari foto yang diunggah Pedagang, bukan `payments.qrString`.
  let qrImageUrl: string | null = null;
  if (current.status === "menunggu_pembayaran") {
    if (isQrisPribadi) {
      qrImageUrl = merchant?.qrisPhotoUrl ?? null;
    } else if (payment?.qrString) {
      qrImageUrl = payment.qrString.startsWith("http")
        ? payment.qrString
        : await QRCode.toDataURL(payment.qrString);
    }
  }

  const sandboxQrUrl =
    current.status === "menunggu_pembayaran" &&
    payment?.provider === "midtrans" &&
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
    deliveryFeeSnapshot: current.deliveryFeeSnapshot,
    totalForMerchant: current.totalForMerchant,
    grandTotal: orderGrandTotal(current),
    amountToPay: orderAmountToPay(current, isQrisPribadi),
    isQrisPribadi,
    fulfillmentMethod: current.fulfillmentMethod,
    // Sengaja tanpa nomor Pedagang (nomor login tidak boleh tampil publik)
    // dan tanpa nomor HP/koordinat Pembeli (tidak dibutuhkan di halaman ini).
    delivery:
      current.fulfillmentMethod === "antar"
        ? {
            address: current.deliveryAddress ?? "",
            landmark: current.deliveryLandmark,
            estimate: merchant?.deliveryEstimate ?? null,
            failureReason: current.deliveryFailureReason,
            failureNote: current.deliveryFailureNote,
          }
        : null,
    createdAt: current.createdAt,
    expiresAt: current.expiresAt,
    paidAt: current.paidAt,
    items: items.map((item) => ({
      id: item.id,
      productNameSnapshot: item.productNameSnapshot,
      priceSnapshot: item.priceSnapshot,
      qty: item.qty,
      note: item.note,
      variantSelections: variantSelectionsByOrderItemId.get(item.id) ?? [],
    })),
    qrImageUrl,
    canSimulate:
      getPaymentProviderName() === "mock" &&
      payment?.provider === "mock" &&
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
  if (payment.provider !== "mock") {
    return { ok: false, message: "Pesanan ini tidak memakai simulasi mock." };
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

/**
 * Tandai Pesanan QRIS pribadi lunas — dipanggil Pedagang dari dashboard
 * setelah dia melihat uang masuk ke rekening/e-wallet pribadinya sendiri
 * (tidak ada webhook gateway untuk mode ini). Beda dari
 * `simulatePaymentSuccess` (dev-only, tidak cek kepemilikan): di sini WAJIB
 * sesi Pedagang + Pesanan itu benar milik Lapak-nya, dan hanya berlaku untuk
 * Pesanan `qris_pribadi` — langsung panggil `settleOrderPayment`, TANPA
 * lewat `PaymentProvider.handleCallback` (tidak ada apa pun untuk diverifikasi).
 */
export async function markQrisPribadiOrderPaid(
  orderId: string,
): Promise<UpdateOrderStatusResult> {
  if (!z.uuid().safeParse(orderId).success) {
    return { ok: false, message: "Pesanan tidak ditemukan." };
  }
  const session = await getMerchantSession();
  if (!session) {
    return { ok: false, message: "Sesi berakhir, silakan login kembali." };
  }

  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, orderId),
      eq(orders.merchantId, session.merchantId),
    ),
  });
  if (!order) {
    return { ok: false, message: "Pesanan tidak ditemukan." };
  }

  const current = await expireOrderIfNeeded(order);
  if (current.status !== "menunggu_pembayaran") {
    return {
      ok: false,
      message: `Pesanan ini sudah tidak bisa dikonfirmasi (status: ${ORDER_STATUS_LABEL_ID[current.status]}).`,
    };
  }

  const payment = await db.query.payments.findFirst({
    where: eq(payments.orderId, current.id),
  });
  if (payment?.provider !== "qris_pribadi") {
    return { ok: false, message: "Pesanan ini tidak memakai QRIS pribadi." };
  }

  await settleOrderPayment(current.id);
  return { ok: true };
}

/** Pesanan aktif (butuh aksi Pedagang) milik Lapak sendiri — identitas dari sesi login. */
export async function listMerchantOrders(): Promise<MerchantOrderListResult> {
  const session = await getMerchantSession();
  if (!session) return { orders: [], totalActive: 0 };

  // JOIN eksplisit (bukan db.query relational API — tidak ada relations()
  // dikonfigurasi di schema.ts) supaya bisa filter dari `payments.provider`
  // MILIK Pesanan itu sendiri (bukan `merchant.paymentMode` saat ini), supaya
  // Pesanan gateway lama tidak salah tampil tombol "Tandai Lunas" kalau Admin
  // sudah pindahkan mode Lapak.
  const activeOrderFilter = and(
    eq(orders.merchantId, session.merchantId),
    or(
      inArray(orders.status, [
        "dibayar",
        "diproses",
        "siap_diambil",
        "sedang_diantar",
      ]),
      // Pesanan QRIS pribadi yang masih menunggu Pedagang menekan
      // "Tandai Lunas".
      and(
        eq(orders.status, "menunggu_pembayaran"),
        eq(payments.provider, "qris_pribadi"),
      ),
    ),
  );

  const [activeOrders, [{ totalActive }]] = await Promise.all([
    db
      .select({ order: orders, paymentProvider: payments.provider })
      .from(orders)
      .innerJoin(payments, eq(payments.orderId, orders.id))
      .where(activeOrderFilter)
      // Antrean FIFO: Pesanan terlama (paling lama menunggu) di atas supaya
      // Pedagang mengerjakan sesuai urutan masuk; Pesanan baru menempel di
      // bawah. Dibatasi ACTIVE_ORDER_LIST_LIMIT — yang tampil selalu yang
      // paling mendesak dikerjakan.
      .orderBy(asc(orders.createdAt))
      .limit(ACTIVE_ORDER_LIST_LIMIT),
    db
      .select({ totalActive: sql<number>`count(*)`.mapWith(Number) })
      .from(orders)
      .innerJoin(payments, eq(payments.orderId, orders.id))
      .where(activeOrderFilter),
  ]);
  if (activeOrders.length === 0) return { orders: [], totalActive: 0 };

  const orderIds = activeOrders.map(({ order }) => order.id);
  const items = await db.query.orderItems.findMany({
    where: inArray(orderItems.orderId, orderIds),
  });
  const itemsByOrderId = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByOrderId.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrderId.set(item.orderId, list);
  }
  const variantSelectionsByOrderItemId =
    await fetchVariantSelectionsByOrderItemId(items.map((item) => item.id));

  return {
    orders: activeOrders.map(({ order, paymentProvider }) => ({
      id: order.id,
      orderCode: order.orderCode,
      status: order.status,
      buyerName: order.buyerName,
      buyerNote: order.buyerNote,
      createdAt: order.createdAt,
      fulfillmentMethod: order.fulfillmentMethod,
      deliveryFeeSnapshot: order.deliveryFeeSnapshot,
      delivery: toMerchantDeliveryView(order),
      items: (itemsByOrderId.get(order.id) ?? []).map((item) => ({
        id: item.id,
        productNameSnapshot: item.productNameSnapshot,
        priceSnapshot: item.priceSnapshot,
        qty: item.qty,
        note: item.note,
        variantSelections: variantSelectionsByOrderItemId.get(item.id) ?? [],
      })),
      awaitingManualConfirmation:
        order.status === "menunggu_pembayaran" &&
        paymentProvider === "qris_pribadi",
    })),
    totalActive,
  };
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
  const variantSelectionsByOrderItemId =
    await fetchVariantSelectionsByOrderItemId(items.map((item) => item.id));

  return pastOrders.map((order) => ({
    id: order.id,
    orderCode: order.orderCode,
    status: order.status,
    buyerName: order.buyerName,
    subtotal: order.subtotal,
    platformFeeSnapshot: order.platformFeeSnapshot,
    deliveryFeeSnapshot: order.deliveryFeeSnapshot,
    totalForMerchant: order.totalForMerchant,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    completedAt: order.completedAt,
    fulfillmentMethod: order.fulfillmentMethod,
    delivery: toMerchantDeliveryView(order),
    items: (itemsByOrderId.get(order.id) ?? []).map((item) => ({
      id: item.id,
      productNameSnapshot: item.productNameSnapshot,
      priceSnapshot: item.priceSnapshot,
      variantSelections: variantSelectionsByOrderItemId.get(item.id) ?? [],
      qty: item.qty,
      note: item.note,
    })),
  }));
}

/**
 * Data struk cetak satu Pesanan milik Lapak sendiri — hanya Pesanan yang sudah
 * lunas (PAID_ORDER_STATUSES). Filter kepemilikan di klausa WHERE, identitas
 * Lapak dari sesi login (tidak pernah dari parameter).
 */
export async function getOrderReceipt(
  orderId: string,
): Promise<GetOrderReceiptResult> {
  if (!z.uuid().safeParse(orderId).success) {
    return { ok: false, message: "Pesanan tidak ditemukan." };
  }
  const session = await getMerchantSession();
  if (!session) {
    return { ok: false, message: "Sesi berakhir, silakan login kembali." };
  }

  const [row] = await db
    .select({
      order: orders,
      stallName: merchants.stallName,
      stallAddress: merchants.address,
      paymentProvider: payments.provider,
    })
    .from(orders)
    .innerJoin(merchants, eq(merchants.id, orders.merchantId))
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.merchantId, session.merchantId),
        inArray(orders.status, [...PAID_ORDER_STATUSES]),
      ),
    )
    .limit(1);
  if (!row) {
    return {
      ok: false,
      message: "Struk hanya untuk Pesanan yang sudah lunas.",
    };
  }

  const { order } = row;
  const items = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, order.id),
  });
  const variantSelectionsByOrderItemId =
    await fetchVariantSelectionsByOrderItemId(items.map((item) => item.id));

  // Sama dengan `amountToPay` di getOrderStatus: QRIS pribadi tidak memungut
  // Biaya Layanan dari Pembeli (ditagih mingguan ke Pedagang).
  const isQrisPribadi = row.paymentProvider === "qris_pribadi";
  const serviceFeePaid = isQrisPribadi ? 0 : order.platformFeeSnapshot;
  const delivery = toMerchantDeliveryView(order);

  return {
    ok: true,
    receipt: {
      stallName: row.stallName,
      stallAddress: row.stallAddress,
      orderCode: order.orderCode,
      buyerName: order.buyerName,
      buyerNote: order.buyerNote,
      paidAt: order.paidAt ?? order.createdAt,
      items: items.map((item) => ({
        id: item.id,
        productNameSnapshot: item.productNameSnapshot,
        priceSnapshot: item.priceSnapshot,
        qty: item.qty,
        note: item.note,
        variantSelections: variantSelectionsByOrderItemId.get(item.id) ?? [],
      })),
      subtotal: order.subtotal,
      serviceFeePaid,
      deliveryFee: order.deliveryFeeSnapshot,
      amountPaid: orderAmountToPay(order, isQrisPribadi),
      delivery: delivery
        ? {
            buyerPhone: delivery.buyerPhone,
            address: delivery.address,
            landmark: delivery.landmark,
          }
        : null,
    },
  };
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

  if (
    nextMerchantStatus(order.status, order.fulfillmentMethod) !== nextStatus
  ) {
    return { ok: false, message: "Perubahan status tidak valid." };
  }

  const [updated] = await db
    .update(orders)
    .set({
      status: nextStatus,
      ...(nextStatus === "selesai" ? { completedAt: new Date() } : {}),
      ...(nextStatus === "sedang_diantar"
        ? { deliveryStartedAt: new Date() }
        : {}),
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

const markDeliveryFailedSchema = z
  .object({
    orderId: z.uuid(),
    reason: z.enum([
      "tidak_bisa_dihubungi",
      "alamat_tidak_ditemukan",
      "lainnya",
    ] satisfies DeliveryFailureReason[]),
    note: z.string().trim().max(200, "Catatan maksimal 200 karakter."),
  })
  .refine((value) => value.reason !== "lainnya" || value.note.length > 0, {
    message: "Tulis catatan singkat untuk alasan lainnya.",
  });

/**
 * Tandai Pesanan Antar `gagal_diantar` (status akhir). Tanpa refund — dana
 * tetap hak Pedagang (ADR 2026-09-28), jadi dijaga dua syarat di server:
 * alasan wajib, dan baru boleh setelah DELIVERY_FAIL_MIN_MINUTES sejak
 * Pesanan masuk `sedang_diantar`. Kepemilikan difilter dari sesi di WHERE.
 */
export async function markDeliveryFailed(
  orderId: string,
  reason: DeliveryFailureReason,
  note: string,
): Promise<UpdateOrderStatusResult> {
  const parsed = markDeliveryFailedSchema.safeParse({ orderId, reason, note });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }
  const session = await getMerchantSession();
  if (!session) {
    return { ok: false, message: "Sesi berakhir, silakan login kembali." };
  }

  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, parsed.data.orderId),
      eq(orders.merchantId, session.merchantId),
    ),
  });
  if (!order) {
    return { ok: false, message: "Pesanan tidak ditemukan." };
  }
  if (order.status !== "sedang_diantar") {
    return {
      ok: false,
      message: "Hanya Pesanan yang sedang diantar yang bisa ditandai gagal.",
    };
  }
  const waitMinutes = minutesUntilDeliveryFailAllowed(order.deliveryStartedAt);
  if (waitMinutes > 0) {
    return {
      ok: false,
      message: `Tombol ini baru bisa dipakai ${waitMinutes} menit lagi.`,
    };
  }

  const [updated] = await db
    .update(orders)
    .set({
      status: "gagal_diantar",
      completedAt: new Date(),
      deliveryFailureReason: parsed.data.reason,
      deliveryFailureNote: parsed.data.note || null,
    })
    .where(
      and(
        eq(orders.id, order.id),
        eq(orders.merchantId, session.merchantId),
        eq(orders.status, "sedang_diantar"), // optimistic lock
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

/**
 * Lacak Pesanan tanpa link (Fase 11, revisi 2026-09-29): cukup Kode Pesanan
 * format baru (8 karakter acak CSPRNG, unik global) — berlaku untuk
 * semua Pesanan. Tanpa sesi, jadi dijaga rate-limit per IP dan pesan gagal
 * yang SAMA untuk semua kasus supaya tidak bisa dipakai menebak. Kode lama
 * (4 karakter, tidak unik & mudah ditebak) ditolak lewat ORDER_CODE_PATTERN.
 * Hanya mengembalikan `orderId` — halaman status yang menampilkan isinya.
 */
export async function findOrderForTracking(
  orderCode: string,
): Promise<TrackOrderResult> {
  const notFound = {
    ok: false as const,
    message: "Pesanan tidak ditemukan. Periksa lagi Kode Pesanan-mu.",
  };

  const ip = await getClientIp();
  if (!checkRateLimit(`track-order:ip:${ip}`, 10, 10 * 60_000)) {
    return {
      ok: false,
      message: "Terlalu banyak percobaan. Silakan coba lagi sebentar lagi.",
    };
  }

  const parsed = trackOrderSchema.safeParse({ orderCode });
  if (!parsed.success) return notFound;

  const order = await db.query.orders.findFirst({
    where: eq(orders.orderCode, parsed.data.orderCode),
    columns: { id: true },
  });
  return order ? { ok: true, orderId: order.id } : notFound;
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
    deliveryFeeSnapshot: order.deliveryFeeSnapshot,
    totalForMerchant: order.totalForMerchant,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    fulfillmentMethod: order.fulfillmentMethod,
    deliveryFailureReason: order.deliveryFailureReason,
    deliveryFailureNote: order.deliveryFailureNote,
  }));
}
