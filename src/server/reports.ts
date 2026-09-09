"use server";

import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getMerchantSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { orderItems, orders, products } from "@/lib/db/schema";
import {
  getMerchantInsights,
  type InsightInput,
  type InsightItem,
  isInsightDataSufficient,
} from "@/lib/report/insights";
import { daysAgo, isReportPeriod, resolvePeriod } from "@/lib/report/period";
import { PAID_ORDER_STATUSES } from "@/lib/utils/order-status";
import type {
  DailySales,
  MerchantSalesReport,
  ReportPeriod,
  SalesSummary,
  TopItem,
} from "@/types/report";

const PAID = [...PAID_ORDER_STATUSES];
const INSIGHT_WINDOW_DAYS = 30;
const TOP_ITEMS_LIMIT = 8;

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

async function summaryInRange(
  merchantId: string,
  start: Date,
  end: Date,
): Promise<SalesSummary> {
  const [row] = await db
    .select({
      orderCount: sql<number>`count(*)`.mapWith(Number),
      revenue: sql<number>`coalesce(sum(${orders.subtotal}), 0)`.mapWith(
        Number,
      ),
      merchantShare:
        sql<number>`coalesce(sum(${orders.totalForMerchant}), 0)`.mapWith(
          Number,
        ),
    })
    .from(orders)
    .where(
      and(
        eq(orders.merchantId, merchantId),
        inArray(orders.status, PAID),
        gte(orders.createdAt, start),
        lt(orders.createdAt, end),
      ),
    );

  const orderCount = row?.orderCount ?? 0;
  const revenue = row?.revenue ?? 0;
  return {
    orderCount,
    revenue,
    merchantShare: row?.merchantShare ?? 0,
    avgOrderValue: orderCount > 0 ? Math.round(revenue / orderCount) : 0,
  };
}

async function dailyInRange(
  merchantId: string,
  start: Date,
  end: Date,
  dayKeys: string[],
): Promise<DailySales[]> {
  const rows = await db
    .select({
      day: sql<string>`to_char((${orders.createdAt} AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD')`,
      revenue: sql<number>`coalesce(sum(${orders.subtotal}), 0)`.mapWith(
        Number,
      ),
      orderCount: sql<number>`count(*)`.mapWith(Number),
    })
    .from(orders)
    .where(
      and(
        eq(orders.merchantId, merchantId),
        inArray(orders.status, PAID),
        gte(orders.createdAt, start),
        lt(orders.createdAt, end),
      ),
    )
    .groupBy(sql`(${orders.createdAt} AT TIME ZONE 'Asia/Jakarta')::date`);

  const byDay = new Map(rows.map((row) => [row.day, row]));
  return dayKeys.map((date) => ({
    date,
    revenue: byDay.get(date)?.revenue ?? 0,
    orderCount: byDay.get(date)?.orderCount ?? 0,
  }));
}

async function topItemsInRange(
  merchantId: string,
  start: Date,
  end: Date,
): Promise<Omit<TopItem, "revenueShare">[]> {
  const rows = await db
    .select({
      productId: orderItems.productId,
      name: sql<string>`coalesce(max(${products.name}), max(${orderItems.productNameSnapshot}))`,
      qtySold: sql<number>`coalesce(sum(${orderItems.qty}), 0)`.mapWith(Number),
      revenue:
        sql<number>`coalesce(sum(${orderItems.priceSnapshot} * ${orderItems.qty}), 0)`.mapWith(
          Number,
        ),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .leftJoin(products, eq(products.id, orderItems.productId))
    .where(
      and(
        eq(orders.merchantId, merchantId),
        inArray(orders.status, PAID),
        gte(orders.createdAt, start),
        lt(orders.createdAt, end),
      ),
    )
    .groupBy(orderItems.productId)
    .orderBy(sql`sum(${orderItems.qty}) desc`)
    .limit(TOP_ITEMS_LIMIT);

  return rows.map((row) => ({
    productId: row.productId,
    name: row.name,
    qtySold: row.qtySold,
    revenue: row.revenue,
  }));
}

async function buildInsightInput(
  merchantId: string,
  now: Date,
): Promise<InsightInput> {
  const windowStart = daysAgo(now, INSIGHT_WINDOW_DAYS);
  const restockStart = daysAgo(now, 7);

  const merchantPaid = and(
    eq(orders.merchantId, merchantId),
    inArray(orders.status, PAID),
  );

  const [
    productRows,
    agg30dRows,
    agg7dRows,
    lastSoldRows,
    firstOrderRow,
    paidCount30dRow,
    hourlyRows,
    weekdayRows,
    comboRows,
  ] = await Promise.all([
    db.query.products.findMany({
      where: eq(products.merchantId, merchantId),
      columns: {
        id: true,
        name: true,
        price: true,
        status: true,
        stock: true,
        createdAt: true,
      },
    }),
    db
      .select({
        productId: orderItems.productId,
        qty: sql<number>`coalesce(sum(${orderItems.qty}), 0)`.mapWith(Number),
        revenue:
          sql<number>`coalesce(sum(${orderItems.priceSnapshot} * ${orderItems.qty}), 0)`.mapWith(
            Number,
          ),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(merchantPaid, gte(orders.createdAt, windowStart)))
      .groupBy(orderItems.productId),
    db
      .select({
        productId: orderItems.productId,
        qty: sql<number>`coalesce(sum(${orderItems.qty}), 0)`.mapWith(Number),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(merchantPaid, gte(orders.createdAt, restockStart)))
      .groupBy(orderItems.productId),
    db
      .select({
        productId: orderItems.productId,
        lastSoldEpoch: sql<string>`extract(epoch from max(${orders.createdAt}))`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(merchantPaid)
      .groupBy(orderItems.productId),
    db
      .select({
        firstEpoch: sql<
          string | null
        >`extract(epoch from min(${orders.createdAt}))`,
      })
      .from(orders)
      .where(merchantPaid)
      .then((rows) => rows[0]),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(orders)
      .where(and(merchantPaid, gte(orders.createdAt, windowStart)))
      .then((rows) => rows[0]),
    db
      .select({
        hour: sql<number>`extract(hour from ${orders.createdAt} AT TIME ZONE 'Asia/Jakarta')`.mapWith(
          Number,
        ),
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(orders)
      .where(and(merchantPaid, gte(orders.createdAt, windowStart)))
      .groupBy(sql`1`),
    db
      .select({
        dow: sql<number>`extract(dow from ${orders.createdAt} AT TIME ZONE 'Asia/Jakarta')`.mapWith(
          Number,
        ),
        totalRevenue: sql<number>`coalesce(sum(${orders.subtotal}), 0)`.mapWith(
          Number,
        ),
        distinctDays:
          sql<number>`count(distinct (${orders.createdAt} AT TIME ZONE 'Asia/Jakarta')::date)`.mapWith(
            Number,
          ),
      })
      .from(orders)
      .where(and(merchantPaid, gte(orders.createdAt, windowStart)))
      .groupBy(sql`1`),
    db
      .select({
        orderId: orderItems.orderId,
        name: sql<string>`coalesce(${products.name}, ${orderItems.productNameSnapshot})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .leftJoin(products, eq(products.id, orderItems.productId))
      .where(and(merchantPaid, gte(orders.createdAt, windowStart))),
  ]);

  const agg30dById = new Map(agg30dRows.map((row) => [row.productId, row]));
  const qty7dById = new Map(agg7dRows.map((row) => [row.productId, row.qty]));
  const lastSoldById = new Map(
    lastSoldRows.map((row) => [
      row.productId,
      new Date(Number(row.lastSoldEpoch) * 1000),
    ]),
  );

  const items: InsightItem[] = productRows.map((product) => {
    const agg = agg30dById.get(product.id);
    return {
      productId: product.id,
      name: product.name,
      price: product.price,
      status: product.status,
      stock: product.stock,
      qtySold7d: qty7dById.get(product.id) ?? 0,
      qtySold30d: agg?.qty ?? 0,
      revenue30d: agg?.revenue ?? 0,
      lastSoldAt: lastSoldById.get(product.id) ?? null,
      createdAt: product.createdAt,
    };
  });

  const hourlyOrderCounts = Array.from({ length: 24 }, () => 0);
  for (const row of hourlyRows) {
    if (row.hour >= 0 && row.hour < 24) hourlyOrderCounts[row.hour] = row.count;
  }

  const totalRevenue = weekdayRows.reduce((sum, r) => sum + r.totalRevenue, 0);
  const totalDistinctDays = weekdayRows.reduce(
    (sum, r) => sum + r.distinctDays,
    0,
  );
  const firstEpoch = firstOrderRow?.firstEpoch ?? null;

  return {
    now,
    firstOrderAt:
      firstEpoch === null ? null : new Date(Number(firstEpoch) * 1000),
    paidOrderCount30d: paidCount30dRow?.count ?? 0,
    items,
    hourlyOrderCounts,
    weekdayStats: weekdayRows.map((row) => ({
      dow: row.dow,
      totalRevenue: row.totalRevenue,
      distinctDays: row.distinctDays,
    })),
    avgDailyRevenue:
      totalDistinctDays > 0 ? totalRevenue / totalDistinctDays : 0,
    topPair: topCoOccurringPair(comboRows),
  };
}

/** Pasangan Item yang paling sering muncul di Pesanan yang sama (dihitung di JS). */
function topCoOccurringPair(
  rows: { orderId: string; name: string }[],
): { nameA: string; nameB: string; count: number } | null {
  const namesByOrder = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = namesByOrder.get(row.orderId) ?? new Set<string>();
    set.add(row.name);
    namesByOrder.set(row.orderId, set);
  }

  const pairCount = new Map<string, number>();
  for (const set of namesByOrder.values()) {
    const names = [...set].sort();
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const key = `${names[i]} ${names[j]}`;
        pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
      }
    }
  }

  let best: { nameA: string; nameB: string; count: number } | null = null;
  for (const [key, count] of pairCount) {
    if (!best || count > best.count) {
      const [nameA, nameB] = key.split(" ");
      best = { nameA, nameB, count };
    }
  }
  return best;
}

/**
 * Laporan penjualan Lapak sendiri (identitas dari sesi login) untuk `period`,
 * plus rekomendasi asisten (jendela tetap 30 hari). `null` kalau sesi habis.
 */
export async function getMerchantSalesReport(
  period: string,
): Promise<MerchantSalesReport | null> {
  const session = await getMerchantSession();
  if (!session) return null;

  const resolved: ReportPeriod = isReportPeriod(period) ? period : "7_hari";
  const now = new Date();
  const { start, end, prevStart, prevEnd, dayKeys } = resolvePeriod(
    resolved,
    now,
  );
  const merchantId = session.merchantId;

  const [summary, prevSummary, daily, topItems, insightInput] =
    await Promise.all([
      summaryInRange(merchantId, start, end),
      summaryInRange(merchantId, prevStart, prevEnd),
      dailyInRange(merchantId, start, end, dayKeys),
      topItemsInRange(merchantId, start, end),
      buildInsightInput(merchantId, now),
    ]);

  return {
    period: resolved,
    summary,
    delta: {
      revenuePct: pctChange(summary.revenue, prevSummary.revenue),
      orderCountPct: pctChange(summary.orderCount, prevSummary.orderCount),
    },
    daily,
    topItems: topItems.map((item) => ({
      ...item,
      revenueShare: summary.revenue > 0 ? item.revenue / summary.revenue : 0,
    })),
    insights: getMerchantInsights(insightInput).slice(0, 4),
    insightsPending: !isInsightDataSufficient(insightInput),
  };
}
