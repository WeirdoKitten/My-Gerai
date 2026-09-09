/** Rentang waktu Laporan Penjualan yang bisa dipilih Pedagang. */
export type ReportPeriod = "hari_ini" | "7_hari" | "30_hari";

export type SalesSummary = {
  orderCount: number;
  /** SUM(orders.subtotal) — total yang dibayar Pembeli ("Omzet"). */
  revenue: number;
  /** SUM(orders.total_for_merchant) — bagian Pedagang setelah Biaya Layanan. */
  merchantShare: number;
  /** revenue / orderCount, 0 kalau belum ada Pesanan. */
  avgOrderValue: number;
};

/** Perubahan persen vs periode sebelumnya yang sama panjang. `null` = periode lalu nol. */
export type SalesDelta = {
  revenuePct: number | null;
  orderCountPct: number | null;
};

export type DailySales = {
  /** Tanggal lokal WIB, format "YYYY-MM-DD". */
  date: string;
  revenue: number;
  orderCount: number;
};

export type TopItem = {
  productId: string;
  /** Nama Item terkini kalau masih ada di katalog, kalau tidak nama snapshot. */
  name: string;
  qtySold: number;
  revenue: number;
  /** Porsi dari total omzet periode, 0..1. */
  revenueShare: number;
};

export type InsightKind =
  | "restock"
  | "item_mati"
  | "jam_ramai"
  | "hari_sepi"
  | "fokus_menu"
  | "sering_bareng"
  | "harga";

/** Satu rekomendasi asisten. `tone`/ikon ditentukan komponen dari `kind`. */
export type Insight = {
  kind: InsightKind;
  title: string;
  body: string;
  /** Makin tinggi makin dulu ditampilkan. */
  priority: number;
};

export type MerchantSalesReport = {
  period: ReportPeriod;
  summary: SalesSummary;
  delta: SalesDelta;
  /** Satu baris per hari dalam periode, urut lama → baru. */
  daily: DailySales[];
  /** Item terlaris dalam periode, urut qty turun (maks 8). */
  topItems: TopItem[];
  /** Rekomendasi asisten (maks 4), kosong kalau `insightsPending`. */
  insights: Insight[];
  /** `true` kalau data belum cukup untuk asisten (lihat lib/report/insights.ts). */
  insightsPending: boolean;
};
