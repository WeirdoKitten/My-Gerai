import { hashPassword } from "../auth/password";
import { client, db } from "./client";
import { admins, merchants, platformConfig, products } from "./schema";
import {
  seedMerchantPhoto,
  seedProductPhoto,
  seedQrisPhoto,
} from "./seed-photo";

/**
 * Seed data DEMO untuk server (staging / demo publik) — versi AMAN dari
 * `seed.ts`:
 *
 * - **Tanpa `TRUNCATE`**. Tidak pernah menghapus data yang sudah ada.
 * - **Idempoten per-Lapak** lewat `onConflictDoNothing({ target: merchants.slug })`
 *   + insert Item digerbang `if (merchant)` (cuma jalan kalau baris Lapak
 *   itu baru dibuat). Sengaja TIDAK ada early-return blanket di awal fungsi
 *   berdasar satu Lapak saja — pernah bikin bug: begitu `bakso-pak-budi`
 *   sudah ada, seluruh fungsi (termasuk Lapak lain yang baru ditambah)
 *   ikut dilewati walau belum pernah dibuat sama sekali.
 *
 * Dijalankan oleh `docker-entrypoint.sh` **hanya bila** env `SEED_DEMO=true`
 * (lihat Dockerfile & docs/TEKNOLOGI.md). Di-bundle jadi
 * `scripts/seed-demo.mjs` (mandiri) oleh esbuild.
 *
 * Untuk dev lokal tetap pakai `pnpm db:seed` (`seed.ts`, dengan TRUNCATE +
 * guard localhost) — itu mereset DB ke kondisi bersih untuk uji manual/E2E.
 * `seed-demo.ts` di sini bukan penggantinya, hanya untuk mengisi server.
 */
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "password";

async function main(): Promise<void> {
  console.log("Mengisi data demo (idempoten per-Lapak)...");
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  await db
    .insert(admins)
    .values({ name: "Admin MyGerai", phone: "081111111111", passwordHash })
    .onConflictDoNothing({ target: admins.phone });

  const [merchant] = await db
    .insert(merchants)
    .values({
      slug: "bakso-pak-budi",
      stallName: "Bakso Pak Budi",
      ownerName: "Budi Santoso",
      category: "Makanan",
      phone: "082222222222",
      passwordHash,
      status: "approved",
      photoUrl: await seedMerchantPhoto("bakso.jpg"),
    })
    .onConflictDoNothing({ target: merchants.slug })
    .returning();

  if (merchant) {
    await db.insert(products).values([
      {
        merchantId: merchant.id,
        name: "Bakso Urat",
        price: 15000,
        costPrice: 9000,
        status: "available",
        photoUrl: await seedProductPhoto("bakso.jpg"),
      },
      {
        merchantId: merchant.id,
        name: "Bakso Halus",
        price: 12000,
        costPrice: 7000,
        status: "available",
        stock: 10,
      },
      {
        merchantId: merchant.id,
        name: "Mie Ayam Bakso",
        price: 17000,
        costPrice: 10000,
        status: "available",
        stock: 6,
        photoUrl: await seedProductPhoto("mie-ayam.jpg"),
      },
      {
        merchantId: merchant.id,
        name: "Es Teh Manis",
        price: 5000,
        costPrice: 2000,
        status: "available",
        photoUrl: await seedProductPhoto("es-teh.jpg"),
      },
      {
        merchantId: merchant.id,
        name: "Pangsit Goreng",
        price: 8000,
        // Sengaja tanpa harga modal — contoh kasus "belum lengkap" di Laporan Penjualan.
        status: "sold_out",
        photoUrl: await seedProductPhoto("pangsit.jpg"),
      },
    ]);
  }

  const [merchantRajaRasa] = await db
    .insert(merchants)
    .values({
      slug: "nasi-goreng-raja-rasa",
      stallName: "Nasi Goreng Raja Rasa",
      ownerName: "Satria",
      category: "Makanan",
      phone: "082343455263",
      passwordHash,
      status: "approved",
      paymentMode: "qris_pribadi",
      qrisPhotoUrl: await seedQrisPhoto("nasi-goreng-raja-rasa.jpg"),
      photoUrl: await seedMerchantPhoto("nasi-goreng-biasa.jpg"),
    })
    .onConflictDoNothing({ target: merchants.slug })
    .returning();

  if (merchantRajaRasa) {
    await db.insert(products).values([
      {
        merchantId: merchantRajaRasa.id,
        name: "Nasi Goreng Biasa",
        price: 15000,
        costPrice: 10000,
        status: "available",
        photoUrl: await seedProductPhoto("nasi-goreng-biasa.jpg"),
      },
      {
        merchantId: merchantRajaRasa.id,
        name: "Nasi Goreng Double Telor",
        price: 18000,
        costPrice: 13000,
        status: "available",
        photoUrl: await seedProductPhoto("nasi-goreng-double-telor.jpg"),
      },
      {
        merchantId: merchantRajaRasa.id,
        name: "Nasi Goreng Mawut",
        price: 18000,
        costPrice: 13000,
        status: "available",
        photoUrl: await seedProductPhoto("nasi-goreng-mawut.jpg"),
      },
      {
        merchantId: merchantRajaRasa.id,
        name: "Kwetiaw Goreng",
        price: 15000,
        costPrice: 10000,
        status: "available",
        photoUrl: await seedProductPhoto("kwetiau-goreng.jpg"),
      },
      {
        merchantId: merchantRajaRasa.id,
        name: "Mie Goreng Biasa",
        price: 15000,
        costPrice: 10000,
        status: "available",
        photoUrl: await seedProductPhoto("mie-goreng-biasa.jpg"),
      },
      {
        merchantId: merchantRajaRasa.id,
        name: "Mie Goreng Double Telor",
        price: 18000,
        costPrice: 13000,
        status: "available",
        photoUrl: await seedProductPhoto("mie-goreng-double-telor.jpg"),
      },
      {
        merchantId: merchantRajaRasa.id,
        name: "Capcay Goreng",
        price: 15000,
        costPrice: 10000,
        status: "available",
        photoUrl: await seedProductPhoto("capcay-goreng.jpg"),
      },
    ]);
  }

  const adaConfig = await db.query.platformConfig.findFirst({
    columns: { id: true },
    where: (c, { eq }) => eq(c.key, "platform_fee_amount"),
  });
  if (!adaConfig) {
    await db.insert(platformConfig).values([
      { key: "platform_fee_amount", value: "1000" },
      { key: "order_expiry_minutes", value: "15" },
    ]);
  }

  console.log("Seed data demo selesai.");
  console.log(
    `  Pedagang approved : 082222222222 / ${DEMO_PASSWORD} -> Bakso Pak Budi`,
  );
  console.log(
    `  Pedagang approved : 082343455263 / ${DEMO_PASSWORD} -> Nasi Goreng Raja Rasa`,
  );
  console.log(`  Admin             : 081111111111 / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Seed data demo GAGAL:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
