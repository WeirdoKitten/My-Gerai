import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { client, db } from "./client";
import { merchants, orderItems, orders, products } from "./schema";

/**
 * Seed riwayat Pesanan demo untuk PRODUKSI/staging — mengisi ±1 bulan
 * riwayat penjualan Lapak demo (`bakso-pak-budi`, `nasi-goreng-raja-rasa`)
 * supaya asisten rekomendasi (lihat src/lib/report/insights.ts) punya data
 * untuk didemokan di server publik, bukan cuma di dev lokal.
 *
 * Beda dari `seed-orders.ts` (dev-only):
 * - **Tanpa guard localhost** — sengaja, dirancang untuk jalan di server.
 * - **Tidak mengubah status Item** apa pun (dev version men-toggle "Pangsit
 *   Goreng" jadi available untuk mensimulasikan "Item mati" — itu mengubah
 *   tampilan menu publik, tidak pantas di server nyata). Cukup pakai Item
 *   yang statusnya sudah "available" apa adanya.
 * - Marker beda (`[seed-demo-orders]`) supaya tidak bentrok dengan Pesanan
 *   hasil `seed-orders.ts` kalau dua-duanya pernah jalan di DB yang sama.
 *
 * Idempoten & aman dijalankan berkali-kali (tiap container start via
 * `docker-entrypoint.sh` saat `SEED_DEMO=true`): hapus dulu Pesanan hasil
 * seed sebelumnya (ditandai lewat `buyerNote`), lalu buat ulang dengan
 * jendela 30 hari yang mengikuti tanggal berjalan — supaya data demo di
 * server tidak basi. Tidak pernah menyentuh Lapak/Pesanan lain.
 *
 * Dijalankan lewat `scripts/seed-demo-orders.mjs` (di-bundle esbuild,
 * lihat Dockerfile) — tidak butuh `pnpm db:seed` dulu, hanya butuh Lapak
 * demo (`seed-demo.ts`) sudah ada.
 */
const SEED_MARKER = "[seed-demo-orders]";
const DAYS = 30;
const BUYER_NAMES = [
  "Rina",
  "Dodi",
  "Sari",
  "Agus",
  "Wati",
  "Bima",
  "Nur",
  "Eka",
  "Joko",
  "Lina",
  "Fajar",
  "Dewi",
  "Rizki",
  "Tono",
  "Yuni",
];
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type MerchantOrderPlan = {
  slug: string;
  /** Seed RNG — beda per Lapak supaya pola tidak identik. */
  rngSeed: number;
  /** Nama Item yang sengaja dibuat lebih sering laku. */
  favoredItem: string;
  /** Pasangan Item yang sengaja sering dibeli bareng (opsional). */
  comboItem?: string;
};

const PLANS: MerchantOrderPlan[] = [
  {
    slug: "bakso-pak-budi",
    rngSeed: 20260909,
    favoredItem: "Bakso Urat",
    comboItem: "Es Teh Manis",
  },
  {
    slug: "nasi-goreng-raja-rasa",
    rngSeed: 20260910,
    favoredItem: "Nasi Goreng Biasa",
    comboItem: "Mie Goreng Biasa",
  },
];

/** RNG deterministik supaya hasil seed konsisten antar-run (mudah di-debug). */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wibDayKeys(days: number): string[] {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayKey = fmt.format(new Date());
  const base = new Date(`${todayKey}T00:00:00Z`).getTime();
  return Array.from({ length: days }, (_, i) =>
    new Date(base - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  );
}

async function seedMerchantOrders(plan: MerchantOrderPlan): Promise<void> {
  const merchant = await db.query.merchants.findFirst({
    where: eq(merchants.slug, plan.slug),
  });
  if (!merchant) {
    console.log(`Lewati "${plan.slug}" — Lapak belum ada.`);
    return;
  }

  const catalog = await db.query.products.findMany({
    where: eq(products.merchantId, merchant.id),
  });
  const sellable = catalog.filter((p) => p.status === "available");
  if (sellable.length === 0) {
    console.log(`Lewati "${plan.slug}" — belum ada Item available.`);
    return;
  }
  const favored = sellable.find((p) => p.name === plan.favoredItem);
  const combo = sellable.find((p) => p.name === plan.comboItem);

  console.log(`Menghapus Pesanan demo sebelumnya untuk "${plan.slug}"...`);
  await db
    .delete(orders)
    .where(
      and(
        eq(orders.merchantId, merchant.id),
        eq(orders.buyerNote, SEED_MARKER),
      ),
    );

  const rand = mulberry32(plan.rngSeed);
  const randInt = (min: number, max: number) =>
    min + Math.floor(rand() * (max - min + 1));
  const pick = <T>(arr: readonly T[]): T =>
    arr[Math.floor(rand() * arr.length)];
  const orderCode = () =>
    Array.from({ length: 4 }, () => pick(CODE_CHARS.split(""))).join("");

  const now = Date.now();
  const orderRows: (typeof orders.$inferInsert)[] = [];
  const itemRows: (typeof orderItems.$inferInsert)[] = [];

  for (const dayKey of wibDayKeys(DAYS)) {
    const dow = new Date(`${dayKey}T12:00:00Z`).getUTCDay(); // 0=Minggu
    const weekend = dow === 0 || dow === 6;
    let count = randInt(3, 7) + (weekend ? randInt(2, 5) : 0);
    if (dow === 3) count = Math.max(1, count - 4); // Rabu sengaja sepi

    for (let i = 0; i < count; i++) {
      const hour = pick([
        10, 11, 12, 12, 12, 13, 13, 14, 16, 18, 19, 19, 20, 21,
      ]);
      const createdAt = new Date(
        `${dayKey}T${String(hour).padStart(2, "0")}:${String(randInt(0, 59)).padStart(2, "0")}:00+07:00`,
      );
      if (createdAt.getTime() > now) continue;

      const ageDays = (now - createdAt.getTime()) / 86_400_000;
      const status =
        ageDays > 2
          ? rand() < 0.9
            ? "selesai"
            : "kedaluwarsa"
          : pick(["dibayar", "diproses", "siap_diambil", "selesai"] as const);
      const paid = status !== "kedaluwarsa";

      // Pilih Item — bias ke Item favorit Lapak ini, plus kombo dengan pasangannya.
      const chosen = new Map<string, (typeof catalog)[number]>();
      if (favored && rand() < 0.6) chosen.set(favored.id, favored);
      const target = pick([1, 1, 2, 2, 2, 3]);
      while (chosen.size < target) {
        const p = pick(sellable);
        chosen.set(p.id, p);
      }
      if (favored && combo && chosen.has(favored.id) && rand() < 0.5) {
        chosen.set(combo.id, combo);
      }

      const lines = [...chosen.values()].map((p) => ({
        product: p,
        qty: pick([1, 1, 1, 2]),
      }));
      const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
      const orderId = randomUUID();
      const paidAt = paid
        ? new Date(createdAt.getTime() + randInt(1, 8) * 60_000)
        : null;

      orderRows.push({
        id: orderId,
        merchantId: merchant.id,
        orderCode: orderCode(),
        buyerName: pick(BUYER_NAMES),
        buyerNote: SEED_MARKER,
        status,
        subtotal,
        platformFeeSnapshot: 1000,
        totalForMerchant: subtotal,
        createdAt,
        paidAt,
        expiresAt: new Date(createdAt.getTime() + 15 * 60_000),
        completedAt:
          status === "selesai" && paidAt
            ? new Date(paidAt.getTime() + randInt(10, 40) * 60_000)
            : null,
      });

      for (const line of lines) {
        itemRows.push({
          orderId,
          productId: line.product.id,
          productNameSnapshot: line.product.name,
          priceSnapshot: line.product.price,
          costPriceSnapshot: line.product.costPrice,
          qty: line.qty,
          note: null,
        });
      }
    }
  }

  console.log(
    `Membuat ${orderRows.length} Pesanan demo (${itemRows.length} baris Item) untuk "${plan.slug}"...`,
  );
  for (let i = 0; i < orderRows.length; i += 100) {
    await db.insert(orders).values(orderRows.slice(i, i + 100));
  }
  for (let i = 0; i < itemRows.length; i += 200) {
    await db.insert(orderItems).values(itemRows.slice(i, i + 200));
  }
}

async function main(): Promise<void> {
  for (const plan of PLANS) {
    await seedMerchantOrders(plan);
  }
  console.log("Selesai seed riwayat Pesanan demo.");
}

main()
  .catch((error) => {
    console.error("Seed riwayat Pesanan demo GAGAL:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
