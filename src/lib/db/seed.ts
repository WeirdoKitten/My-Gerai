import "dotenv/config";
import { sql } from "drizzle-orm";
import { client, db } from "./client";
import {
  admins,
  merchants,
  orderItems,
  orders,
  payments,
  payouts,
  platformConfig,
  products,
} from "./schema";

const connectionString = process.env.DATABASE_URL ?? "";
if (
  !connectionString.includes("localhost") &&
  !connectionString.includes("127.0.0.1")
) {
  throw new Error(
    "Seed script hanya boleh dijalankan ke database lokal (localhost/127.0.0.1). " +
      "DATABASE_URL saat ini tidak cocok — dibatalkan demi keamanan (mencegah TRUNCATE " +
      "tidak sengaja mengenai database produksi di server Garuda nanti).",
  );
}

async function main() {
  console.log("Menghapus data lama...");
  await db.execute(
    sql`TRUNCATE TABLE ${payouts}, ${payments}, ${orderItems}, ${orders}, ${products}, ${merchants}, ${admins}, ${platformConfig} RESTART IDENTITY CASCADE`,
  );

  console.log("Membuat data seed...");

  const [merchant] = await db
    .insert(merchants)
    .values({
      slug: "bakso-pak-budi",
      stallName: "Bakso Pak Budi",
      ownerName: "Budi Santoso",
      category: "Makanan",
      phone: "081200000001",
      // Placeholder — BUKAN hash asli. Login Pedagang belum ada sampai Fase 3.
      passwordHash: "seed-placeholder-not-a-real-hash",
      status: "approved",
    })
    .returning();

  await db.insert(products).values([
    {
      merchantId: merchant.id,
      name: "Bakso Urat",
      price: 15000,
      status: "available",
    },
    {
      merchantId: merchant.id,
      name: "Bakso Halus",
      price: 12000,
      status: "available",
    },
    {
      merchantId: merchant.id,
      name: "Mie Ayam Bakso",
      price: 17000,
      status: "available",
    },
    {
      merchantId: merchant.id,
      name: "Es Teh Manis",
      price: 5000,
      status: "available",
    },
    {
      merchantId: merchant.id,
      name: "Pangsit Goreng",
      price: 8000,
      status: "sold_out",
    },
  ]);

  await db.insert(platformConfig).values([
    { key: "platform_fee_amount", value: "1000" },
    { key: "order_expiry_minutes", value: "15" },
  ]);

  console.log("Selesai. Coba buka: http://localhost:3000/menu/bakso-pak-budi");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
