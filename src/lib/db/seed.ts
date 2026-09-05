import "dotenv/config";
import { sql } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
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
  sessions,
} from "./schema";

const SEED_PASSWORD = "Password123!";

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
    sql`TRUNCATE TABLE ${sessions}, ${payouts}, ${payments}, ${orderItems}, ${orders}, ${products}, ${merchants}, ${admins}, ${platformConfig} RESTART IDENTITY CASCADE`,
  );

  console.log("Membuat data seed...");

  const passwordHash = await hashPassword(SEED_PASSWORD);

  const [merchant] = await db
    .insert(merchants)
    .values({
      slug: "bakso-pak-budi",
      stallName: "Bakso Pak Budi",
      ownerName: "Budi Santoso",
      category: "Makanan",
      phone: "081200000001",
      passwordHash,
      status: "approved",
    })
    .returning();

  // Fixture untuk menguji jalur "menunggu approval Admin" (Fase 4 belum ada
  // UI approve, jadi ini satu-satunya cara login-dengan-password-benar-tapi-
  // belum-approved bisa diuji sampai Fase 4 dikerjakan).
  await db.insert(merchants).values({
    slug: "batagor-bu-siti",
    stallName: "Batagor Bu Siti",
    ownerName: "Siti Aminah",
    category: "Makanan",
    phone: "081200000002",
    passwordHash,
    status: "pending",
  });

  // Lapak approved KEDUA — dipakai untuk menguji isolasi data antar-Lapak
  // (Pedagang A tidak boleh bisa ubah Item/Pesanan milik Pedagang B).
  const [merchantTwo] = await db
    .insert(merchants)
    .values({
      slug: "warung-cak-slamet",
      stallName: "Warung Cak Slamet",
      ownerName: "Slamet Riyadi",
      category: "Makanan",
      phone: "081200000003",
      passwordHash,
      status: "approved",
    })
    .returning();

  await db.insert(products).values({
    merchantId: merchantTwo.id,
    name: "Nasi Goreng",
    price: 13000,
    status: "available",
  });

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
  console.log("");
  console.log("Kredensial uji Pedagang (login di /login):");
  console.log(
    `  Approved : 081200000001 / ${SEED_PASSWORD} -> masuk dashboard`,
  );
  console.log(
    `  Pending  : 081200000002 / ${SEED_PASSWORD} -> pesan menunggu approval`,
  );
  console.log(
    `  Approved2: 081200000003 / ${SEED_PASSWORD} -> Lapak kedua, untuk uji isolasi`,
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
