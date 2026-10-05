"use server";

import { desc, eq, sql } from "drizzle-orm";
import { getMerchantSession } from "@/lib/auth/session";
import { invalidateStallCatalogCache } from "@/lib/cache/stall-catalog";
import { db } from "@/lib/db/client";
import { merchantReviews, orders } from "@/lib/db/schema";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMIT_MESSAGE,
} from "@/lib/rate-limit/limiter";
import { fetchRatingSummaries } from "@/lib/review/queries";
import {
  type SubmitOrderReviewInput,
  submitOrderReviewSchema,
} from "@/lib/validation/review.schema";
import type {
  MerchantReviewsPage,
  SubmitOrderReviewResult,
} from "@/types/review";

const REVIEW_RATE_LIMIT = 10;
const REVIEW_RATE_WINDOW_MS = 10 * 60 * 1000;

/** Batas ulasan yang dimuat di dashboard Pedagang (skala kaki lima — KISS, sama seperti Riwayat). */
const MERCHANT_REVIEWS_LIMIT = 100;

/**
 * Pembeli memberi Rating & Ulasan untuk Pesanan miliknya. Tanpa akun: UUID
 * Pesanan (link status) jadi bukti beli. Hanya Pesanan `selesai`, satu ulasan
 * per Pesanan (dijaga `UNIQUE(order_id)` — aman dari klik ganda/race), final.
 */
export async function submitOrderReview(
  input: SubmitOrderReviewInput,
): Promise<SubmitOrderReviewResult> {
  const ip = await getClientIp();
  if (
    !checkRateLimit(`review:ip:${ip}`, REVIEW_RATE_LIMIT, REVIEW_RATE_WINDOW_MS)
  ) {
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  const parsed = submitOrderReviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Ulasan tidak valid.",
    };
  }
  const { orderId, rating, comment } = parsed.data;

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    columns: { id: true, merchantId: true, status: true },
  });
  if (!order) return { ok: false, message: "Pesanan tidak ditemukan." };
  if (order.status !== "selesai") {
    return {
      ok: false,
      message: "Ulasan bisa diberikan setelah Pesanan selesai.",
    };
  }

  const inserted = await db
    .insert(merchantReviews)
    .values({
      merchantId: order.merchantId,
      orderId: order.id,
      rating,
      comment: comment ?? null,
    })
    .onConflictDoNothing({ target: merchantReviews.orderId })
    .returning({ id: merchantReviews.id });
  if (inserted.length === 0) {
    return { ok: false, message: "Pesanan ini sudah diberi ulasan." };
  }

  invalidateStallCatalogCache();
  return { ok: true };
}

/** Semua ulasan Lapak sendiri (`/dashboard/ulasan`) — identitas dari sesi login. */
export async function listMerchantReviews(): Promise<MerchantReviewsPage | null> {
  const session = await getMerchantSession();
  if (!session) return null;

  const [summaries, distributionRows, rows] = await Promise.all([
    fetchRatingSummaries([session.merchantId]),
    db
      .select({
        rating: merchantReviews.rating,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(merchantReviews)
      .where(eq(merchantReviews.merchantId, session.merchantId))
      .groupBy(merchantReviews.rating),
    db
      .select({
        id: merchantReviews.id,
        rating: merchantReviews.rating,
        comment: merchantReviews.comment,
        createdAt: merchantReviews.createdAt,
        buyerName: orders.buyerName,
        orderCode: orders.orderCode,
      })
      .from(merchantReviews)
      .innerJoin(orders, eq(orders.id, merchantReviews.orderId))
      .where(eq(merchantReviews.merchantId, session.merchantId))
      .orderBy(desc(merchantReviews.createdAt))
      .limit(MERCHANT_REVIEWS_LIMIT),
  ]);

  const distribution: MerchantReviewsPage["distribution"] = [0, 0, 0, 0, 0];
  for (const row of distributionRows) {
    distribution[row.rating - 1] = row.count;
  }

  return {
    summary: summaries.get(session.merchantId) ?? { average: null, count: 0 },
    distribution,
    reviews: rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      buyerName: row.buyerName,
      orderCode: row.orderCode,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
