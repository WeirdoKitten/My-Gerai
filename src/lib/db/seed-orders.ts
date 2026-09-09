import "dotenv/config";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { client, db } from "./client";
import { merchants, orderItems, orders, products } from "./schema";

/**
 * Seed Pesanan historis untuk DEV — mengisi ±1 bulan riwayat penjualan Lapak
 * `bakso-pak-budi` supaya halaman **Laporan Penjualan** + asisten rekomendasi
 * punya data untuk ditampilkan/diuji.
 *
 * - Guard localhost (sama seperti `seed.ts`).
 * - Idempoten: hapus dulu Pesanan hasil seed sebelumnya (ditandai lewat
 *   `buyerNote`), lalu buat ulang. Tidak menyentuh Pesanan buatan tangan.
 * - Pola sengaja dibuat: Bakso Urat terlaris, "Pangsit Goreng" tidak pernah
 *   laku (jadi contoh "Item mati"), puncak jam makan siang & malam, Rabu sepi,
 *   Bakso Urat sering dibeli bareng Es Teh Manis.
 *
 * Jalankan: `pnpm db:seed` dulu (data dasar), lalu `pnpm db:seed:orders`.
 */
const MERCHANT_SLUG = "bakso-pak-budi";
const DAYS = 30;
const DEAD_ITEM_NAME = "Pangsit Goreng";
const SEED_MARKER = "[seed-orders]";
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

const connectionString = process.env.DATABASE_URL ?? "";
if (
  !connectionString.includes("localhost") &&
  !connectionString.includes("127.0.0.1")
) {
  throw new Error(
    "seed-orders hanya boleh dijalankan ke database lokal (localhost/127.0.0.1).",
  );
}

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

const rand = mulberry32(20260909);
const randInt = (min: number, max: number) =>
  min + Math.floor(rand() * (max - min + 1));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const orderCode = () =>
  Array.from({ length: 4 }, () => pick(CODE_CHARS.split(""))).join("");

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

async function main(): Promise<void> {
  const merchant = await db.query.merchants.findFirst({
    where: eq(merchants.slug, MERCHANT_SLUG),
  });
  if (!merchant) {
    throw new Error(
      `Lapak "${MERCHANT_SLUG}" belum ada. Jalankan 'pnpm db:seed' dulu.`,
    );
  }

  // Jadikan Item "mati" tersedia (di seed default statusnya sold_out) supaya
  // rule "Item mati" punya kandidat available yang tidak pernah laku.
  await db
    .update(products)
    .set({ status: "available" })
    .where(
      and(
        eq(products.merchantId, merchant.id),
        eq(products.name, DEAD_ITEM_NAME),
      ),
    );

  const catalog = await db.query.products.findMany({
    where: eq(products.merchantId, merchant.id),
  });
  const sellable = catalog.filter((p) => p.name !== DEAD_ITEM_NAME);
  const baksoUrat = sellable.find((p) => p.name === "Bakso Urat");
  const esTeh = sellable.find((p) => p.name === "Es Teh Manis");
  if (sellable.length === 0) {
    throw new Error("Lapak belum punya Item. Jalankan 'pnpm db:seed' dulu.");
  }

  console.log("Menghapus Pesanan hasil seed sebelumnya...");
  await db
    .delete(orders)
    .where(
      and(
        eq(orders.merchantId, merchant.id),
        eq(orders.buyerNote, SEED_MARKER),
      ),
    );

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

      // Pilih Item — bias ke Bakso Urat, plus kombo Bakso Urat + Es Teh.
      const chosen = new Map<string, (typeof catalog)[number]>();
      if (baksoUrat && rand() < 0.6) chosen.set(baksoUrat.id, baksoUrat);
      const target = pick([1, 1, 2, 2, 2, 3]);
      while (chosen.size < target) {
        const p = pick(sellable);
        chosen.set(p.id, p);
      }
      if (baksoUrat && esTeh && chosen.has(baksoUrat.id) && rand() < 0.5) {
        chosen.set(esTeh.id, esTeh);
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
        totalForMerchant: Math.max(0, subtotal - 1000),
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
          qty: line.qty,
          note: null,
        });
      }
    }
  }

  console.log(
    `Membuat ${orderRows.length} Pesanan (${itemRows.length} baris Item)...`,
  );
  for (let i = 0; i < orderRows.length; i += 100) {
    await db.insert(orders).values(orderRows.slice(i, i + 100));
  }
  for (let i = 0; i < itemRows.length; i += 200) {
    await db.insert(orderItems).values(itemRows.slice(i, i + 200));
  }

  console.log(
    `Selesai. Login Pedagang 082222222222 / password → buka tab "Laporan".`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
