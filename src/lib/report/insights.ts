import { formatRupiah } from "@/lib/utils/money";
import type { Insight } from "@/types/report";

/** Ambang data minimum sebelum asisten berani memberi rekomendasi. */
export const INSIGHT_MIN_PAID_ORDERS = 20;
export const INSIGHT_MIN_HISTORY_DAYS = 7;

const DAY_MS = 86_400_000;

export type InsightItem = {
  productId: string;
  name: string;
  price: number;
  status: "available" | "sold_out";
  /** `null` = stok tak dibatasi. */
  stock: number | null;
  qtySold7d: number;
  qtySold30d: number;
  revenue30d: number;
  lastSoldAt: Date | null;
  /** Kapan Item dibuat — Item baru tidak dituduh "mati". */
  createdAt: Date;
};

export type WeekdayStat = {
  /** 0 = Minggu … 6 = Sabtu (sama dengan Postgres `extract(dow)`). */
  dow: number;
  totalRevenue: number;
  /** Berapa tanggal berbeda yang jatuh di hari ini dalam jendela 30 hari. */
  distinctDays: number;
};

export type InsightInput = {
  now: Date;
  /** Pesanan dibayar paling awal (kapan pun) — untuk cek umur riwayat. */
  firstOrderAt: Date | null;
  /** Jumlah Pesanan dibayar dalam 30 hari terakhir. */
  paidOrderCount30d: number;
  items: InsightItem[];
  /** Panjang 24 — jumlah Pesanan per jam (WIB) dalam 30 hari terakhir. */
  hourlyOrderCounts: number[];
  weekdayStats: WeekdayStat[];
  /** Rata-rata omzet per hari-berjualan dalam 30 hari terakhir. */
  avgDailyRevenue: number;
  /** Pasangan Item yang paling sering muncul di Pesanan yang sama. */
  topPair: { nameA: string; nameB: string; count: number } | null;
};

const DAY_LABEL = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

function daysSince(from: Date, now: Date): number {
  return Math.floor((now.getTime() - from.getTime()) / DAY_MS);
}

function hourRange(hour: number): string {
  const end = (hour + 1) % 24;
  const pad = (h: number) => String(h).padStart(2, "0");
  return `${pad(hour)}.00–${pad(end)}.00`;
}

/** Item ber-stok yang lajunya bakal menghabiskan stok < ~3 hari. */
function restockInsight(input: InsightInput): Insight | null {
  const candidates = input.items
    .filter((item) => item.status === "available" && item.stock !== null)
    .map((item) => ({ item, rate: item.qtySold7d / 7 }))
    .filter(({ item, rate }) => rate >= 0.5 && rate * 3 > (item.stock ?? 0))
    .sort((a, b) => b.rate - a.rate);

  const top = candidates[0];
  if (!top) return null;

  const perDay = Math.max(1, Math.round(top.rate));
  return {
    kind: "restock",
    title: `Stok "${top.item.name}" menipis`,
    body: `Laku sekitar ${perDay} porsi/hari minggu ini, stok tinggal ${top.item.stock}. Siapkan tambahan sebelum kehabisan di tengah jualan.`,
    priority: 90,
  };
}

/** Item tersedia tapi tidak laku ≥ 14 hari. */
function deadItemInsight(input: InsightInput): Insight | null {
  const dead = input.items.filter(
    (item) =>
      item.status === "available" &&
      daysSince(item.createdAt, input.now) >= 14 &&
      (item.lastSoldAt === null || daysSince(item.lastSoldAt, input.now) >= 14),
  );
  if (dead.length === 0) return null;

  const names = dead.map((item) => `"${item.name}"`).join(", ");
  return {
    kind: "item_mati",
    title:
      dead.length === 1
        ? `${names} belum laku 2 minggu`
        : `${dead.length} Item belum laku 2 minggu`,
    body: `${names} tidak terjual dalam 14 hari terakhir. Coba perbarui foto/harga, tawarkan langsung ke Pembeli, atau tandai habis dulu supaya katalog lebih ramping.`,
    priority: 55,
  };
}

/** Jam tersibuk kalau menonjol (≥ 25% Pesanan). */
function peakHourInsight(input: InsightInput): Insight | null {
  const total = input.hourlyOrderCounts.reduce((sum, n) => sum + n, 0);
  if (total < INSIGHT_MIN_PAID_ORDERS) return null;

  let bestHour = 0;
  let bestPair = -1;
  for (let h = 0; h < 24; h++) {
    const pair =
      input.hourlyOrderCounts[h] + (input.hourlyOrderCounts[h + 1] ?? 0);
    if (pair > bestPair) {
      bestPair = pair;
      bestHour = h;
    }
  }

  const share = bestPair / total;
  if (share < 0.25) return null;

  return {
    kind: "jam_ramai",
    title: `Paling ramai jam ${hourRange(bestHour)}`,
    body: `Sekitar ${Math.round(share * 100)}% Pesanan masuk di jam segini. Pastikan stok, kembalian, dan tenaga sudah siap sebelum jam ${hourRange(bestHour).slice(0, 5)}.`,
    priority: 70,
  };
}

/** Hari-dalam-minggu paling sepi (omzet rata-rata jauh di bawah biasanya). */
function slowDayInsight(input: InsightInput): Insight | null {
  if (input.avgDailyRevenue <= 0) return null;

  const rated = input.weekdayStats
    .filter((w) => w.distinctDays >= 2)
    .map((w) => ({ dow: w.dow, avg: w.totalRevenue / w.distinctDays }));
  if (rated.length < 4) return null;

  const slowest = rated.reduce((min, w) => (w.avg < min.avg ? w : min));
  if (slowest.avg > input.avgDailyRevenue * 0.6) return null;

  return {
    kind: "hari_sepi",
    title: `${DAY_LABEL[slowest.dow]} paling sepi`,
    body: `Rata-rata omzet ${DAY_LABEL[slowest.dow]} cuma ${formatRupiah(Math.round(slowest.avg))} — di bawah hari biasa. Coba promo kecil hari itu, atau kurangi belanja bahan supaya tidak mubazir.`,
    priority: 50,
  };
}

/** Beberapa Item yang menyumbang ≥ 80% omzet — jaga jangan sampai habis. */
function paretoInsight(input: InsightInput): Insight | null {
  const sold = input.items
    .filter((item) => item.revenue30d > 0)
    .sort((a, b) => b.revenue30d - a.revenue30d);
  if (sold.length < 4) return null;

  const total = sold.reduce((sum, item) => sum + item.revenue30d, 0);
  if (total <= 0) return null;

  const core: string[] = [];
  let cumulative = 0;
  for (const item of sold) {
    core.push(item.name);
    cumulative += item.revenue30d;
    if (cumulative / total >= 0.8) break;
  }
  if (core.length === 0 || core.length > sold.length * 0.6) return null;

  return {
    kind: "fokus_menu",
    title: `${core.length} Item ini = 80% omzetmu`,
    body: `${core.map((n) => `"${n}"`).join(", ")} menghasilkan sebagian besar pemasukanmu 30 hari terakhir. Ini prioritas utama — jangan sampai kehabisan bahan atau kehabisan stok.`,
    priority: 80,
  };
}

/** Dua Item yang sering dibeli bersamaan → ide paket. */
function comboInsight(input: InsightInput): Insight | null {
  const pair = input.topPair;
  if (!pair || pair.count < 5) return null;

  return {
    kind: "sering_bareng",
    title: `"${pair.nameA}" & "${pair.nameB}" sering dibeli bareng`,
    body: `Pembeli memesan keduanya bersama ${pair.count} kali. Coba tawarkan sebagai paket hemat — bisa mendorong yang cuma beli satu jadi ambil dua.`,
    priority: 45,
  };
}

/** Item terlaris yang harganya di bawah median — ada ruang naik harga. */
function pricingInsight(input: InsightInput): Insight | null {
  const available = input.items.filter((item) => item.status === "available");
  if (available.length < 3) return null;

  const prices = available.map((item) => item.price).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const median =
    prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];

  const topSellers = [...available]
    .sort((a, b) => b.qtySold30d - a.qtySold30d)
    .slice(0, 3)
    .filter((item) => item.qtySold30d > 0 && item.price < median)
    .sort((a, b) => a.price - b.price);

  const pick = topSellers[0];
  if (!pick) return null;

  return {
    kind: "harga",
    title: `"${pick.name}" murah tapi laris`,
    body: `Termasuk 3 Item terlaris tapi harganya (${formatRupiah(pick.price)}) di bawah rata-rata menu. Naik Rp1.000–2.000 kemungkinan tidak mengurangi minat, tapi menambah margin tiap porsi.`,
    priority: 40,
  };
}

const RULES = [
  restockInsight,
  paretoInsight,
  peakHourInsight,
  deadItemInsight,
  slowDayInsight,
  comboInsight,
  pricingInsight,
];

/**
 * Mesin asisten — deterministik, tanpa AI. Mengembalikan rekomendasi terurut
 * prioritas (tertinggi dulu). Kosong kalau data belum cukup (gerbang di
 * {@link INSIGHT_MIN_PAID_ORDERS} / {@link INSIGHT_MIN_HISTORY_DAYS}); pemanggil
 * bisa cek lewat {@link isInsightDataSufficient}.
 */
export function getMerchantInsights(input: InsightInput): Insight[] {
  if (!isInsightDataSufficient(input)) return [];

  return RULES.map((rule) => rule(input))
    .filter((insight): insight is Insight => insight !== null)
    .sort((a, b) => b.priority - a.priority);
}

export function isInsightDataSufficient(input: InsightInput): boolean {
  if (input.paidOrderCount30d < INSIGHT_MIN_PAID_ORDERS) return false;
  if (input.firstOrderAt === null) return false;
  if (daysSince(input.firstOrderAt, input.now) < INSIGHT_MIN_HISTORY_DAYS) {
    return false;
  }
  return true;
}
