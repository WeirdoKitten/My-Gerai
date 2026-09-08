import { hashPassword } from "../auth/password";
import { client, db } from "./client";
import { admins, merchants, platformConfig, products } from "./schema";

/**
 * Seed data DEMO untuk server (staging / demo publik) — versi AMAN dari
 * `seed.ts`:
 *
 * - **Tanpa `TRUNCATE`**. Tidak pernah menghapus data yang sudah ada.
 * - **Idempoten**. Kalau Lapak demo `bakso-pak-budi` sudah ada, seluruh
 *   proses dilewati. Insert lain juga pakai `onConflictDoNothing`.
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
  const sudahAda = await db.query.merchants.findFirst({
    columns: { id: true },
    where: (m, { eq }) => eq(m.slug, "bakso-pak-budi"),
  });
  if (sudahAda) {
    console.log("Data demo sudah ada — seed dilewati (idempoten).");
    return;
  }

  console.log("Mengisi data demo...");
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
    })
    .onConflictDoNothing({ target: merchants.slug })
    .returning();

  const [merchantTwo] = await db
    .insert(merchants)
    .values({
      slug: "warung-cak-slamet",
      stallName: "Warung Cak Slamet",
      ownerName: "Slamet Riyadi",
      category: "Makanan",
      phone: "084444444444",
      passwordHash,
      status: "approved",
    })
    .onConflictDoNothing({ target: merchants.slug })
    .returning();

  await db
    .insert(merchants)
    .values([
      {
        slug: "batagor-bu-siti",
        stallName: "Batagor Bu Siti",
        ownerName: "Siti Aminah",
        category: "Makanan",
        phone: "083333333333",
        passwordHash,
        status: "pending",
      },
      {
        slug: "cakue-mang-udin",
        stallName: "Cakue Mang Udin",
        ownerName: "Udin Saepudin",
        category: "Makanan",
        phone: "085555555555",
        passwordHash,
        status: "pending",
      },
    ])
    .onConflictDoNothing({ target: merchants.slug });

  if (merchant) {
    await db.insert(products).values([
      {
        merchantId: merchant.id,
        name: "Bakso Urat",
        price: 15000,
        status: "available",
        photoUrl: "/img/menu/bakso.jpg",
      },
      {
        merchantId: merchant.id,
        name: "Bakso Halus",
        price: 12000,
        status: "available",
        stock: 10,
      },
      {
        merchantId: merchant.id,
        name: "Mie Ayam Bakso",
        price: 17000,
        status: "available",
        stock: 6,
        photoUrl: "/img/menu/mie-ayam.jpg",
      },
      {
        merchantId: merchant.id,
        name: "Es Teh Manis",
        price: 5000,
        status: "available",
        photoUrl: "/img/menu/es-teh.jpg",
      },
      {
        merchantId: merchant.id,
        name: "Pangsit Goreng",
        price: 8000,
        status: "sold_out",
        photoUrl: "/img/menu/pangsit.jpg",
      },
    ]);
  }
  if (merchantTwo) {
    await db.insert(products).values({
      merchantId: merchantTwo.id,
      name: "Nasi Goreng",
      price: 13000,
      status: "available",
      photoUrl: "/img/menu/nasi-goreng.jpg",
    });
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
  console.log(`  Pedagang approved : 082222222222 / ${DEMO_PASSWORD}`);
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
