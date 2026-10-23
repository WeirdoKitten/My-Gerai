import type { OrderItemSubstitution } from "@/lib/utils/order-substitution";
import type { EventSalesSummary, ProxyStallSales } from "@/types/event";

/** Gerai event, urut tampil ke peserta. `isProxy` = Gerai Titipan milik EO ini. */
export type SummaryStall = {
  merchantId: string;
  stallName: string;
  isProxy: boolean;
};

/** Pesanan event yang sudah dibayar (status `dibayar` ke atas). */
export type SummaryOrder = {
  id: string;
  merchantId: string;
  stallName: string;
  isProxy: boolean;
  subtotal: number;
};

/** Item Pesanan Gerai Titipan (Item Gerai asli tidak dibutuhkan). */
export type SummaryItem = {
  orderId: string;
  priceSnapshot: number;
  costPriceSnapshot: number | null;
  qty: number;
  substitution: OrderItemSubstitution | null;
};

function emptySales(): ProxyStallSales {
  return {
    revenue: 0,
    cost: 0,
    refundDue: 0,
    profit: 0,
    profitIncomplete: false,
  };
}

/**
 * Ringkasan penjualan event untuk EO. Gerai asli cukup jumlah Pesanan
 * (omzetnya milik Pedagang). Gerai Titipan milik EO sendiri ditambah omzet,
 * modal, uang yang dikembalikan manual (Item `tidak_tersedia`), dan
 * keuntungan. Gerai yang punya Pesanan tapi sudah dikeluarkan dari event
 * tetap ikut, di urutan paling akhir.
 */
export function summarizeEventSales(
  stalls: SummaryStall[],
  orders: SummaryOrder[],
  proxyItems: SummaryItem[],
): EventSalesSummary {
  const rows = new Map<string, EventSalesSummary["stalls"][number]>();
  const addStall = (stall: SummaryStall) => {
    if (rows.has(stall.merchantId)) return;
    rows.set(stall.merchantId, {
      merchantId: stall.merchantId,
      stallName: stall.stallName,
      isProxy: stall.isProxy,
      orderCount: 0,
      sales: stall.isProxy ? emptySales() : null,
    });
  };
  for (const stall of stalls) addStall(stall);

  const merchantByOrderId = new Map<string, string>();
  for (const order of orders) {
    addStall(order);
    const row = rows.get(order.merchantId);
    if (!row) continue;
    row.orderCount += 1;
    if (row.sales) {
      row.sales.revenue += order.subtotal;
      merchantByOrderId.set(order.id, order.merchantId);
    }
  }

  for (const item of proxyItems) {
    const merchantId = merchantByOrderId.get(item.orderId);
    const sales = merchantId ? rows.get(merchantId)?.sales : null;
    if (!sales) continue;
    if (item.substitution === "tidak_tersedia") {
      // Tidak dibelikan: uangnya dikembalikan, modalnya nol.
      sales.refundDue += item.priceSnapshot * item.qty;
    } else if (item.costPriceSnapshot === null) {
      sales.profitIncomplete = true;
    } else {
      sales.cost += item.costPriceSnapshot * item.qty;
    }
  }

  let proxyTotals: ProxyStallSales | null = null;
  for (const row of rows.values()) {
    if (!row.sales) continue;
    row.sales.profit = row.sales.revenue - row.sales.cost - row.sales.refundDue;
    proxyTotals ??= emptySales();
    proxyTotals.revenue += row.sales.revenue;
    proxyTotals.cost += row.sales.cost;
    proxyTotals.refundDue += row.sales.refundDue;
    proxyTotals.profit += row.sales.profit;
    proxyTotals.profitIncomplete ||= row.sales.profitIncomplete;
  }

  return {
    totalOrders: orders.length,
    stalls: [...rows.values()],
    proxyTotals,
  };
}
