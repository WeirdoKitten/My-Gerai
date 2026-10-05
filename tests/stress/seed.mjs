// Seeder data stress test: banyak Lapak + Item + sesi login + Pesanan
// historis dalam jumlah besar (default 200.000) langsung via SQL
// `generate_series` supaya cepat. HANYA untuk database lokal.
//
// Pakai:
//   DATABASE_URL=postgresql://.../mygerai_test node tests/stress/seed.mjs
// Opsi env: STRESS_MERCHANTS (default 200), STRESS_HISTORY_ORDERS (default 200000)
//
// Lapak:
//   stress-hot        Lapak "ramai", menerima ~50% Pesanan historis
//   stress-stok       Lapak untuk uji race stok (1 Item stok 50)
//   stress-qris-NNN   Lapak QRIS pribadi (untuk uji job tagihan mingguan)
//   stress-lapak-NNN  Lapak gateway biasa
// Token sesi Pedagang: "stress-token-<slug>", Admin: "stress-admin-token".

import { createHash, randomBytes, scryptSync } from "node:crypto";
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? "";
if (!url.includes("localhost") && !url.includes("127.0.0.1")) {
  throw new Error("Seeder stress hanya untuk database lokal.");
}

const MERCHANTS = Number(process.env.STRESS_MERCHANTS ?? 200);
const HISTORY = Number(process.env.STRESS_HISTORY_ORDERS ?? 200_000);
const QRIS_MERCHANTS = Math.min(20, Math.floor(MERCHANTS / 10));

const sql = postgres(url, { max: 4, onnotice: () => {} });
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

async function main() {
  console.time("seed");
  console.log("Hapus data stress lama...");
  await sql`DELETE FROM order_item_variant_selections WHERE order_item_id IN (
    SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id
    JOIN merchants m ON m.id = o.merchant_id WHERE m.slug LIKE 'stress-%')`;
  await sql`DELETE FROM payments WHERE order_id IN (SELECT o.id FROM orders o JOIN merchants m ON m.id = o.merchant_id WHERE m.slug LIKE 'stress-%')`;
  await sql`DELETE FROM order_items WHERE order_id IN (SELECT o.id FROM orders o JOIN merchants m ON m.id = o.merchant_id WHERE m.slug LIKE 'stress-%')`;
  await sql`DELETE FROM service_fee_invoices WHERE merchant_id IN (SELECT id FROM merchants WHERE slug LIKE 'stress-%')`;
  await sql`DELETE FROM orders WHERE merchant_id IN (SELECT id FROM merchants WHERE slug LIKE 'stress-%')`;
  await sql`DELETE FROM products WHERE merchant_id IN (SELECT id FROM merchants WHERE slug LIKE 'stress-%')`;
  await sql`DELETE FROM merchants WHERE slug LIKE 'stress-%'`;
  await sql`DELETE FROM admin_sessions WHERE token_hash = ${sha256("stress-admin-token")}`;

  // Hash password sekali (format bebas — Pedagang stress login lewat token sesi, bukan password).
  const salt = randomBytes(16);
  const passwordHash = `scrypt$${salt.toString("hex")}$${scryptSync("password", salt, 64).toString("hex")}`;

  const slugs = ["stress-hot", "stress-stok"];
  for (let i = 1; i <= QRIS_MERCHANTS; i++)
    slugs.push(`stress-qris-${String(i).padStart(3, "0")}`);
  while (slugs.length < MERCHANTS)
    slugs.push(`stress-lapak-${String(slugs.length).padStart(3, "0")}`);

  console.log(`Buat ${slugs.length} Lapak...`);
  const merchantRows = slugs.map((slug, i) => ({
    slug,
    stall_name: `Lapak Stress ${i}`,
    owner_name: `Pedagang ${i}`,
    category: "Makanan",
    phone: `0899${String(i).padStart(8, "0")}`,
    password_hash: passwordHash,
    latitude: -6.2 + i * 0.0001,
    longitude: 106.8 + i * 0.0001,
    address: `Jl. Stress No. ${i}`,
    status: "approved",
    payment_mode: slug.startsWith("stress-qris") ? "qris_pribadi" : "gateway",
    qris_photo_url: slug.startsWith("stress-qris")
      ? "/uploads/dummy.png"
      : null,
    delivery_enabled: true,
    delivery_fee: 5000,
    delivery_radius_km: 5,
  }));
  const merchants =
    await sql`INSERT INTO merchants ${sql(merchantRows)} RETURNING id, slug`;
  const idBySlug = new Map(merchants.map((m) => [m.slug, m.id]));

  console.log("Buat Item (10 per Lapak)...");
  const productRows = [];
  for (const m of merchants) {
    for (let p = 0; p < 10; p++) {
      productRows.push({
        merchant_id: m.id,
        name: `Item ${p + 1}`,
        description: "Item uji stress test dengan deskripsi singkat.",
        price: 10_000 + p * 2_000,
        cost_price: 6_000 + p * 1_000,
        // Lapak stress-stok: Item pertama stok terbatas 50 untuk uji race.
        stock: m.slug === "stress-stok" && p === 0 ? 50 : null,
        status: "available",
      });
    }
  }
  for (let i = 0; i < productRows.length; i += 1000) {
    await sql`INSERT INTO products ${sql(productRows.slice(i, i + 1000))}`;
  }

  console.log("Buat sesi login Pedagang & Admin...");
  const far = new Date(Date.now() + 30 * 86_400_000);
  const sessionRows = merchants.map((m) => ({
    merchant_id: m.id,
    token_hash: sha256(`stress-token-${m.slug}`),
    expires_at: far,
  }));
  await sql`INSERT INTO sessions ${sql(sessionRows)} ON CONFLICT (token_hash) DO NOTHING`;
  const [admin] = await sql`SELECT id FROM admins LIMIT 1`;
  if (admin) {
    await sql`INSERT INTO admin_sessions ${sql({ admin_id: admin.id, token_hash: sha256("stress-admin-token"), expires_at: far })}`;
  }

  console.log(
    `Buat ${HISTORY} Pesanan historis (2 baris Item + 1 payment per Pesanan)...`,
  );
  const hotId = idBySlug.get("stress-hot");
  const otherIds = merchants
    .filter((m) => m.slug !== "stress-stok")
    .map((m) => m.id);
  // Sebar dalam batch 50.000 supaya transaksi tidak terlalu besar.
  const BATCH = 50_000;
  for (let start = 0; start < HISTORY; start += BATCH) {
    const n = Math.min(BATCH, HISTORY - start);
    await sql.begin(async (tx) => {
      await tx`
        CREATE TEMP TABLE tmp_orders ON COMMIT DROP AS
        SELECT gen_random_uuid() AS id,
               CASE WHEN g % 2 = 0 THEN ${hotId}::uuid
                    ELSE (${otherIds}::uuid[])[1 + (g % ${otherIds.length})] END AS merchant_id,
               g AS seq,
               now() - (random() * interval '120 days') AS created_at,
               (ARRAY['selesai','selesai','selesai','selesai','selesai','selesai','kedaluwarsa','kedaluwarsa','dibatalkan','selesai'])[1 + (g % 10)]::order_status AS status
        FROM generate_series(${start + 1}::int, ${start + n}::int) g`;
      await tx`
        INSERT INTO orders (id, merchant_id, order_code, buyer_name, status, subtotal,
          platform_fee_snapshot, total_for_merchant, created_at, paid_at, expires_at, completed_at)
        SELECT id, merchant_id,
               -- Kode unik deterministik 8 karakter dari charset resmi (basis 32).
               (SELECT string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + ((seq + 1000000000) / (32 ^ k)::bigint % 32)::int, 1), '' ORDER BY k DESC)
                  FROM generate_series(0, 7) k),
               'Pembeli ' || seq, status, 32000, 1000, 32000, created_at,
               CASE WHEN status = 'selesai' THEN created_at + interval '1 minute' END,
               created_at + interval '15 minutes',
               CASE WHEN status = 'selesai' THEN created_at + interval '20 minutes' END
        FROM tmp_orders`;
      await tx`
        INSERT INTO order_items (order_id, product_id, product_name_snapshot, price_snapshot, cost_price_snapshot, qty)
        SELECT t.id, p.id, p.name, p.price, p.cost_price, 1 + (t.seq % 2)
        FROM tmp_orders t
        JOIN LATERAL (SELECT id, name, price, cost_price FROM products
                      WHERE merchant_id = t.merchant_id ORDER BY name LIMIT 2) p ON true`;
      await tx`
        INSERT INTO payments (order_id, provider, reference_id, gross_amount, status, paid_at)
        SELECT t.id,
               -- Lapak QRIS pribadi memakai provider-nya sendiri supaya ikut job tagihan mingguan.
               CASE WHEN m.payment_mode = 'qris_pribadi' THEN 'qris_pribadi' ELSE 'mock' END::payment_provider,
               'MOCK-' || t.id, 33000,
               CASE WHEN t.status = 'selesai' THEN 'success' ELSE 'expired' END::payment_status,
               CASE WHEN t.status = 'selesai' THEN t.created_at + interval '1 minute' END
        FROM tmp_orders t JOIN merchants m ON m.id = t.merchant_id`;
    });
    console.log(`  ${start + n}/${HISTORY}`);
  }

  await sql`ANALYZE`;
  const [{ count }] = await sql`SELECT count(*)::int FROM orders`;
  console.log(`Selesai. Total baris orders sekarang: ${count}`);
  console.timeEnd("seed");
  await sql.end();
}

main().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(1);
});
