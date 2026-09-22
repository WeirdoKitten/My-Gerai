import "dotenv/config";
import { sql } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { client, db } from "./client";
import {
  adminSessions,
  admins,
  merchants,
  orderItems,
  orders,
  payments,
  payouts,
  platformConfig,
  products,
  sessions,
} from "./schema";
import {
  seedMerchantPhoto,
  seedProductPhoto,
  seedQrisPhoto,
} from "./seed-photo";

const SEED_PASSWORD = "password";

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
    sql`TRUNCATE TABLE ${adminSessions}, ${sessions}, ${payouts}, ${payments}, ${orderItems}, ${orders}, ${products}, ${merchants}, ${admins}, ${platformConfig} RESTART IDENTITY CASCADE`,
  );

  console.log("Membuat data seed...");

  const passwordHash = await hashPassword(SEED_PASSWORD);

  await db.insert(admins).values({
    name: "Admin MyGerai",
    phone: "081111111111",
    passwordHash,
  });

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
    .returning();

  await db.insert(products).values([
    {
      merchantId: merchant.id,
      name: "Bakso Urat",
      price: 15000,
      costPrice: 10000,
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
      costPrice: 12000,
      status: "available",
      stock: 6,
      photoUrl: await seedProductPhoto("mie-ayam.jpg"),
    },
    {
      merchantId: merchant.id,
      name: "Es Teh Manis",
      price: 5000,
      costPrice: 0,
      status: "available",
      photoUrl: await seedProductPhoto("es-teh.jpg"),
    },
    {
      merchantId: merchant.id,
      name: "Pangsit Goreng",
      price: 8000,
      costPrice: 3000,
      status: "sold_out",
      photoUrl: await seedProductPhoto("pangsit.jpg"),
    },
  ]);

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
    .returning();

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

  await db.insert(platformConfig).values([
    { key: "platform_fee_amount", value: "1000" },
    { key: "order_expiry_minutes", value: "15" },
  ]);

  console.log("Selesai. Coba buka: http://localhost:3000/menu/bakso-pak-budi");
  console.log("");
  console.log("Kredensial uji Pedagang (login di /login):");
  console.log(`  082222222222 / ${SEED_PASSWORD} -> Bakso Pak Budi`);
  console.log(
    `  082343455263 / ${SEED_PASSWORD} -> Nasi Goreng Raja Rasa (QRIS pribadi)`,
  );
  console.log("");
  console.log("Kredensial uji Admin (login di /admin/login):");
  console.log(`  081111111111 / ${SEED_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
