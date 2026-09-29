// Dev: baca DATABASE_URL dari .env (di server tidak ada file .env, env dari Dokploy).
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { and, desc, eq, like, lte } from "drizzle-orm";
import { SEED_DEMO_INVOICE_PREFIX } from "../billing/constants";
import { resolveBillingPeriod } from "../billing/period";
import { client, db } from "./client";
import { merchants, platformConfig, serviceFeeInvoices } from "./schema";

/**
 * Seed contoh Tagihan Biaya Layanan untuk Lapak demo QRIS pribadi
 * (`nasi-goreng-raja-rasa`) — supaya halaman `/dashboard/pembayaran` dan
 * `/admin/invoices` punya isi untuk didemokan (2026-09-30).
 *
 * Isi (4 periode tertutup terakhir, relatif terhadap tanggal berjalan):
 * 2 `lunas`, 1 `dibatalkan`, 1 `belum_lunas`. Tagihan hasil seed ditandai
 * `referenceId` berawalan `SEED_DEMO_INVOICE_PREFIX` — dikecualikan dari penguncian
 * Lapak (`isMerchantOrderingLocked`) supaya Lapak demo tidak pernah terkunci
 * gara-gara tagihan contoh yang memang tidak bisa dibayar sungguhan.
 *
 * Idempoten & aman untuk produksi (jalan tiap container start saat
 * `SEED_DEMO=true`, lihat docker-entrypoint.sh): hapus tagihan hasil seed
 * sebelumnya milik Lapak ini saja, lalu buat ulang mengikuti tanggal berjalan.
 * Tagihan asli (hasil job `bill-service-fee`) tidak pernah disentuh; kalau
 * periodenya bentrok dengan tagihan asli, tagihan contoh untuk periode itu
 * dilewati (`UNIQUE(merchant_id, period_start)`).
 *
 * Catatan: karena tagihan contoh menutupi periode-periode itu, job tagihan
 * asli menganggap Pesanan QRIS Lapak demo di periode tersebut sudah tertagih
 * (lihat `notYetInvoiced` di src/lib/billing/service-fee.ts). Tidak masalah
 * untuk Lapak demo, tapi JANGAN pakai seeder ini untuk Lapak sungguhan.
 */
const MERCHANT_SLUG = "nasi-goreng-raja-rasa";
const DAY_MS = 86_400_000;
const DEFAULT_CYCLE_DAYS = 7;

/** Urut dari periode paling lama ke yang baru saja tutup. */
const PLAN: Array<{
  orderCount: number;
  status: "lunas" | "dibatalkan" | "belum_lunas";
  voidReason?: string;
}> = [
  { orderCount: 23, status: "lunas" },
  { orderCount: 31, status: "lunas" },
  {
    orderCount: 18,
    status: "dibatalkan",
    voidReason: "Contoh: tagihan dibatalkan Admin karena salah hitung periode.",
  },
  { orderCount: 27, status: "belum_lunas" },
];

async function activeNumberConfig(key: string, fallback: number) {
  const row = await db.query.platformConfig.findFirst({
    where: and(
      eq(platformConfig.key, key),
      lte(platformConfig.effectiveFrom, new Date()),
    ),
    orderBy: [desc(platformConfig.effectiveFrom)],
  });
  const value = Number(row?.value);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function main(): Promise<void> {
  const merchant = await db.query.merchants.findFirst({
    where: eq(merchants.slug, MERCHANT_SLUG),
  });
  if (!merchant) {
    console.log(`Lewati tagihan demo, Lapak "${MERCHANT_SLUG}" belum ada.`);
    return;
  }

  const cycleDays = await activeNumberConfig(
    "service_fee_billing_cycle_days",
    DEFAULT_CYCLE_DAYS,
  );
  const platformFee = await activeNumberConfig("platform_fee_amount", 1000);

  await db
    .delete(serviceFeeInvoices)
    .where(
      and(
        eq(serviceFeeInvoices.merchantId, merchant.id),
        like(serviceFeeInvoices.referenceId, `${SEED_DEMO_INVOICE_PREFIX}%`),
      ),
    );

  const now = new Date();
  const latest = resolveBillingPeriod(now, cycleDays);
  const cycleMs = cycleDays * DAY_MS;

  const rows = PLAN.map((plan, index) => {
    const offset = PLAN.length - 1 - index;
    const periodStart = new Date(
      latest.periodStart.getTime() - offset * cycleMs,
    );
    const periodEnd = new Date(periodStart.getTime() + cycleMs);
    const id = randomUUID();
    const amount = plan.orderCount * platformFee;
    return {
      id,
      merchantId: merchant.id,
      periodStart,
      periodEnd,
      amount,
      // Sama aturan job asli: jatuh tempo = saat tagihan terbit (±1 jam
      // setelah periode tutup untuk job yang tepat waktu).
      dueAt: new Date(periodEnd.getTime() + 60 * 60_000),
      status: plan.status,
      provider: "mock" as const,
      referenceId: `${SEED_DEMO_INVOICE_PREFIX}svcfee-${id}`,
      qrString: `MYGERAI-MOCK-INVOICE|invoiceId=${id}|amount=${amount}`,
      paidAt:
        plan.status === "lunas" ? new Date(periodEnd.getTime() + DAY_MS) : null,
      voidReason: plan.voidReason ?? null,
      createdAt: new Date(periodEnd.getTime() + 60 * 60_000),
    };
  });

  const inserted = await db
    .insert(serviceFeeInvoices)
    .values(rows)
    .onConflictDoNothing({
      target: [serviceFeeInvoices.merchantId, serviceFeeInvoices.periodStart],
    })
    .returning({ id: serviceFeeInvoices.id });
  console.log(
    `Membuat ${inserted.length} tagihan demo untuk "${MERCHANT_SLUG}" (lunas, dibatalkan, belum lunas).`,
  );
}

main()
  .catch((error) => {
    console.error("Seed tagihan demo GAGAL:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
