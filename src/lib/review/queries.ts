import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { merchantReviews, orders } from "@/lib/db/schema";
import { maskBuyerName, toRatingSummary } from "@/lib/review/rating";
import type {
  OrderReviewView,
  PublicReviewView,
  RatingSummary,
} from "@/types/review";

/**
 * Query baca Rating & Ulasan yang dipakai beberapa modul server. Sengaja di
 * luar file `"use server"` supaya tidak ikut terekspos sebagai Server Action.
 */

/** Ringkasan rating banyak Lapak sekaligus (satu query `GROUP BY`, bukan per Lapak). */
export async function fetchRatingSummaries(
  merchantIds: string[],
): Promise<Map<string, RatingSummary>> {
  const result = new Map<string, RatingSummary>();
  if (merchantIds.length === 0) return result;

  const rows = await db
    .select({
      merchantId: merchantReviews.merchantId,
      sum: sql<number>`sum(${merchantReviews.rating})`.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(merchantReviews)
    .where(inArray(merchantReviews.merchantId, merchantIds))
    .groupBy(merchantReviews.merchantId);

  for (const row of rows) {
    result.set(row.merchantId, toRatingSummary(row.sum, row.count));
  }
  return result;
}

/** Jumlah ulasan terbaru yang tampil di halaman menu Pembeli. */
export const PUBLIC_RECENT_REVIEWS_LIMIT = 10;

/** Ringkasan + ulasan terbaru satu Lapak untuk halaman menu publik (nama Pembeli disamarkan). */
export async function fetchPublicStallReviews(merchantId: string): Promise<{
  summary: RatingSummary;
  recent: PublicReviewView[];
}> {
  const [summaries, rows] = await Promise.all([
    fetchRatingSummaries([merchantId]),
    db
      .select({
        id: merchantReviews.id,
        rating: merchantReviews.rating,
        comment: merchantReviews.comment,
        createdAt: merchantReviews.createdAt,
        buyerName: orders.buyerName,
      })
      .from(merchantReviews)
      .innerJoin(orders, eq(orders.id, merchantReviews.orderId))
      .where(eq(merchantReviews.merchantId, merchantId))
      .orderBy(desc(merchantReviews.createdAt))
      .limit(PUBLIC_RECENT_REVIEWS_LIMIT),
  ]);

  return {
    summary: summaries.get(merchantId) ?? { average: null, count: 0 },
    recent: rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      buyerDisplayName: maskBuyerName(row.buyerName),
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

/** Ulasan milik satu Pesanan (`null` kalau belum diulas). */
export async function fetchOrderReview(
  orderId: string,
): Promise<OrderReviewView | null> {
  const review = await db.query.merchantReviews.findFirst({
    where: eq(merchantReviews.orderId, orderId),
    columns: { rating: true, comment: true, createdAt: true },
  });
  if (!review) return null;
  return {
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
  };
}
